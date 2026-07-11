const ASSISTANT_API_URL = "https://eddie-portfolio-ai-api-9516.azurewebsites.net/ask";

const ASSISTANT_FEEDBACK_API_URL = ASSISTANT_API_URL.replace(
    /\/ask$/,
    "/feedback"
);

const ASSISTANT_SCRIPT_SRC =
    document.currentScript && document.currentScript.src
        ? document.currentScript.src
        : "";

const ASSISTANT_BASE_URL = ASSISTANT_SCRIPT_SRC
    ? new URL(".", ASSISTANT_SCRIPT_SRC).href
    : "";

const ASSISTANT_AVATAR_URL = ASSISTANT_SCRIPT_SRC
    ? new URL("../images/ariel-avatar.webp", ASSISTANT_SCRIPT_SRC).href
    : "images/ariel-avatar.webp";

document.addEventListener("DOMContentLoaded", () => {
    ensureAssistantWidget();

    const widget = document.getElementById("assistantWidget");
    const toggleButton = document.getElementById("assistantToggle");
    const calloutButton = document.getElementById("assistantCallout");
    const closeButton = document.getElementById("assistantClose");
    const openAssistantLink = document.getElementById("openAssistantLink");

    const form = document.getElementById("assistantForm");
    const input = document.getElementById("assistantInput");
    const messages = document.getElementById("assistantMessages");
    const submitButton = document.getElementById("assistantSubmit");
    const status = document.getElementById("assistantStatus");
    let typingIndicator = null;
    let lastAssistantTrigger = null;

    let assistantChatHistory = [];
    const MAX_ASSISTANT_HISTORY_MESSAGES = 8;

    const assistantSessionId = createAssistantSessionId();

    if (
        !widget ||
        !toggleButton ||
        !closeButton ||
        !form ||
        !input ||
        !messages ||
        !submitButton ||
        !status
    ) {
        return;
    }

    toggleButton.addEventListener("click", () => {
        if (widget.classList.contains("assistant-open")) {
            closeAssistant();
        } else {
            openAssistant("compact", toggleButton);
        }
    });

    if (calloutButton) {
        calloutButton.addEventListener("click", () => {
            openAssistant("compact", calloutButton);
        });
    }

    closeButton.addEventListener("click", () => {
        closeAssistant();
    });

    if (openAssistantLink) {
        openAssistantLink.addEventListener("click", (event) => {
            event.preventDefault();
            openAssistant("docked", openAssistantLink);
        });
    }

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            widget.classList.contains("assistant-open")
        ) {
            closeAssistant();
        }
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const question = input.value.trim();

        if (!question) {
            return;
        }

        const chatHistoryForRequest = assistantChatHistory.slice(
            -MAX_ASSISTANT_HISTORY_MESSAGES
        );

        addMessage("user", question);
        input.value = "";

        setLoading(true, "");
        showTypingIndicator();

        try {
            const response = await fetch(ASSISTANT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question,
                    session_id: assistantSessionId,
                    chat_history: chatHistoryForRequest,
                    include_sources: false,
                    include_diagnostics: false
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    extractApiError(data) || `Request failed with status ${response.status}`
                );
            }

            removeTypingIndicator();

            const answerText = data.answer || "I could not generate an answer.";

            const assistantMessageElement = await addAssistantMessageWithTyping(
                answerText
            );

            if (
                shouldShowFeedbackControls(
                    question,
                    answerText
                )
            ) {
                addFeedbackControls(
                    assistantMessageElement,
                    question,
                    answerText
                );
            }

            appendAssistantChatHistory(
                "user",
                question
            );

            appendAssistantChatHistory(
                "assistant",
                answerText
            );

        } catch (error) {
            console.error("Assistant API error:", error);

            removeTypingIndicator();

            addMessage(
                "assistant",
                "I could not reach Ariel right now. Please try again in a moment."
            );

        } finally {
            removeTypingIndicator();
            setLoading(false, "");
            input.focus();
        }
    });

    function openAssistant(mode = "compact", triggerElement = null) {
        const isDocked = mode === "docked";

        lastAssistantTrigger =
            triggerElement instanceof HTMLElement
                ? triggerElement
                : document.activeElement;

        widget.classList.add("assistant-open");
        widget.classList.toggle("assistant-docked", isDocked);
        document.body.classList.toggle("assistant-dock-open", isDocked);

        toggleButton.setAttribute("aria-expanded", "true");

        if (openAssistantLink) {
            openAssistantLink.setAttribute("aria-expanded", "true");
        }

        const panel = document.getElementById("assistantPanel");

        if (panel) {
            panel.setAttribute("aria-hidden", "false");
            panel.dataset.assistantMode = mode;
        }

        setTimeout(() => {
            input.focus();
            messages.scrollTop = messages.scrollHeight;
        }, 100);
    }

    function closeAssistant() {
        widget.classList.remove(
            "assistant-open",
            "assistant-docked"
        );

        document.body.classList.remove(
            "assistant-dock-open"
        );

        toggleButton.setAttribute(
            "aria-expanded",
            "false"
        );

        if (openAssistantLink) {
            openAssistantLink.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        const panel = document.getElementById(
            "assistantPanel"
        );

        if (panel) {
            panel.setAttribute(
                "aria-hidden",
                "true"
            );

            delete panel.dataset.assistantMode;
        }

        const triggerToRestore = lastAssistantTrigger;
        lastAssistantTrigger = null;

        if (
            triggerToRestore &&
            typeof triggerToRestore.focus === "function"
        ) {
            setTimeout(() => {
                triggerToRestore.focus();
            }, 0);
        }
    }

    function addMessage(role, text) {
        const message = document.createElement("div");

        if (role === "user") {
            message.className = "assistant-message assistant-message-user";
            message.textContent = text;
        } else {
            message.className = "assistant-message assistant-message-bot";
            message.innerHTML = formatAssistantText(text);
        }

        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    }


    async function addAssistantMessageWithTyping(text) {
        const message = document.createElement("div");
        message.className = "assistant-message assistant-message-bot";

        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;

        const chunks = splitAssistantResponse(text);
        let visibleText = "";

        for (const chunk of chunks) {
            visibleText += chunk;
            message.innerHTML = formatAssistantText(visibleText);
            messages.scrollTop = messages.scrollHeight;

            await wait(getTypingDelay(chunk));
        }

        return message;
    }


    function splitAssistantResponse(text) {
        return text.match(/(\S+\s*)/g) || [text];
    }

    function getTypingDelay(chunk) {
        const trimmedChunk = chunk.trim();

        if (!trimmedChunk) {
            return 35;
        }

        if (/[.!?]$/.test(trimmedChunk)) {
            return 220;
        }

        if (/[,;:]$/.test(trimmedChunk)) {
            return 130;
        }

        return 80;
    }

    function wait(milliseconds) {
        return new Promise((resolve) => {
            setTimeout(resolve, milliseconds);
        });
    }

    function appendAssistantChatHistory(role, content) {
        const normalizedContent = String(content || "").trim();

        if (!normalizedContent) {
            return;
        }

        assistantChatHistory.push({
            role: role,
            content: normalizedContent
        });

        if (assistantChatHistory.length > MAX_ASSISTANT_HISTORY_MESSAGES) {
            assistantChatHistory = assistantChatHistory.slice(
                -MAX_ASSISTANT_HISTORY_MESSAGES
            );
        }
    }

    function shouldShowFeedbackControls(question, answer) {
        const normalizedQuestion = String(question || "")
            .trim()
            .toLowerCase()
            .replace(/[.!?]+$/g, "")
            .replace(/\s+/g, " ");

        const normalizedAnswer = String(answer || "")
            .trim()
            .toLowerCase();

        if (!normalizedQuestion || !normalizedAnswer) {
            return false;
        }

        const courtesyMessages = new Set([
            "thank you",
            "thanks",
            "thanks ariel",
            "thank you ariel",
            "thank you so much",
            "thanks so much",
            "thank you for your assistance",
            "thanks for your assistance",
            "thank you for the assistance",
            "thanks for the assistance",
            "thank you for your help",
            "thanks for your help",
            "appreciate it",
            "i appreciate it",
            "much appreciated",
            "okay",
            "ok",
            "ok thanks",
            "okay thanks",
            "got it",
            "great",
            "nice",
            "cool",
            "perfect",
            "awesome",
            "sounds good",
            "that helps",
            "this helps"
        ]);

        if (courtesyMessages.has(normalizedQuestion)) {
            return false;
        }

        if (
            normalizedQuestion.length <= 24 &&
            (
                normalizedQuestion.startsWith("thank") ||
                normalizedQuestion.startsWith("thanks") ||
                normalizedQuestion === "ok" ||
                normalizedQuestion === "okay"
            )
        ) {
            return false;
        }

        return true;
    }

    function createFeedbackButton(feedbackType, ariaLabel) {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "assistant-feedback-button";
        button.dataset.feedback = feedbackType;
        button.setAttribute("aria-label", ariaLabel);
        button.setAttribute("aria-pressed", "false");

        const iconPath = feedbackType === "up"
            ? `
                <path d="M7 10v12"></path>
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z"></path>
            `
            : `
                <path d="M17 14V2"></path>
                <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H20a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22a3.13 3.13 0 0 1-3-3.88Z"></path>
            `;

        button.innerHTML = `
            <svg
                class="assistant-feedback-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
                focusable="false"
            >
                ${iconPath}
            </svg>
        `;

        return button;
    }


    function addFeedbackControls(messageElement, question, answer) {
        if (!messageElement) {
            return;
        }

        const feedbackWrapper = document.createElement("div");
        feedbackWrapper.className = "assistant-feedback";

        const feedbackPrompt = document.createElement("span");
        feedbackPrompt.className = "assistant-feedback-prompt";
        feedbackPrompt.textContent = "Was this helpful?";

        const upButton = createFeedbackButton(
            "up",
            "Mark Ariel response as helpful"
        );

        const downButton = createFeedbackButton(
            "down",
            "Mark Ariel response as not helpful"
        );

        const feedbackStatus = document.createElement("span");
        feedbackStatus.className = "assistant-feedback-status";

        feedbackWrapper.appendChild(feedbackPrompt);
        feedbackWrapper.appendChild(upButton);
        feedbackWrapper.appendChild(downButton);
        feedbackWrapper.appendChild(feedbackStatus);

        messageElement.appendChild(feedbackWrapper);
        messages.scrollTop = messages.scrollHeight;

        upButton.addEventListener("click", () => {
            submitAssistantFeedback({
                question,
                answer,
                feedback: "up",
                upButton,
                downButton,
                feedbackStatus
            });
        });

        downButton.addEventListener("click", () => {
            submitAssistantFeedback({
                question,
                answer,
                feedback: "down",
                upButton,
                downButton,
                feedbackStatus
            });
        });
    }


    async function submitAssistantFeedback({
        question,
        answer,
        feedback,
        upButton,
        downButton,
        feedbackStatus
    }) {
        const selectedButton = feedback === "up" ? upButton : downButton;
        const otherButton = feedback === "up" ? downButton : upButton;

        selectedButton.classList.add("is-selected");
        selectedButton.setAttribute("aria-pressed", "true");

        otherButton.classList.remove("is-selected");
        otherButton.setAttribute("aria-pressed", "false");

        upButton.disabled = true;
        downButton.disabled = true;
        feedbackStatus.textContent = "Saving...";

        try {
            const response = await fetch(ASSISTANT_FEEDBACK_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    session_id: assistantSessionId,
                    question: question,
                    answer: answer,
                    feedback: feedback,
                    source: "portfolio_widget"
                })
            });

            let data = {};

            try {
                data = await response.json();
            } catch {
                data = {};
            }

            if (!response.ok) {
                throw new Error(
                    extractApiError(data) || `Feedback failed with status ${response.status}`
                );
            }

            const feedbackWrapper = upButton.closest(".assistant-feedback");

            if (feedbackWrapper) {
                feedbackWrapper.textContent = "";

                const thankYouMessage = document.createElement("span");
                thankYouMessage.className = "assistant-feedback-status";
                thankYouMessage.textContent = "Thanks for the feedback.";

                feedbackWrapper.appendChild(thankYouMessage);
            } else {
                feedbackStatus.textContent = "Thanks for the feedback.";
            }

        } catch (error) {
            console.error("Assistant feedback error:", error);

            selectedButton.classList.remove("is-selected");
            selectedButton.setAttribute("aria-pressed", "false");

            upButton.disabled = false;
            downButton.disabled = false;
            feedbackStatus.textContent = "Could not save feedback.";
        }
    }


    function createAssistantSessionId() {
        if (
            window.crypto &&
            typeof window.crypto.randomUUID === "function"
        ) {
            return window.crypto.randomUUID();
        }

        return `ariel-session-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`;
    }


    function setLoading(isLoading, message) {
        submitButton.disabled = isLoading;
        input.disabled = isLoading;
        status.textContent = message;
    }

    function showTypingIndicator() {
        removeTypingIndicator();

        typingIndicator = document.createElement("div");
        typingIndicator.className = "assistant-message assistant-message-bot assistant-message-typing";
        typingIndicator.textContent = "Ariel is typing";

        messages.appendChild(typingIndicator);
        messages.scrollTop = messages.scrollHeight; 
    }

    function removeTypingIndicator() {
        if (typingIndicator) {
            typingIndicator.remove();
            typingIndicator = null;
        }
    }

    function extractApiError(data) {
        if (Array.isArray(data.detail)) {
            return data.detail
                .map((item) => item.msg)
                .filter(Boolean)
                .join(" ");
        }

        if (typeof data.detail === "string") {
            return data.detail;
        }

        return null;
    }

    function formatAssistantText(text) {
        const escaped = escapeHtml(text);

        const withLinks = escaped.replace(
            /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
        );

        return withLinks.replace(/\n/g, "<br>");
    }

    function escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }
});

function ensureAssistantWidget() {
    if (document.getElementById("assistantWidget")) {
        return;
    }

    const assistantWidget = document.createElement("div");

    assistantWidget.id = "assistantWidget";
    assistantWidget.className = "assistant-widget";

    assistantWidget.innerHTML = `
        <button
            id="assistantCallout"
            class="assistant-callout"
            type="button"
        >
            <span class="assistant-callout-small">Hi, I am Ariel</span>
            <span class="assistant-callout-main">Eddie&apos;s portfolio assistant</span>
        </button>

        <button
            id="assistantToggle"
            class="assistant-toggle"
            type="button"
            aria-label="Open Ariel, Eddie&apos;s portfolio assistant"
            aria-expanded="false"
        >
            <img
                src="${ASSISTANT_AVATAR_URL}"
                alt="Ariel, Eddie&apos;s portfolio assistant"
                class="assistant-avatar-image"
            />
        </button>

        <div
            id="assistantPanel"
            class="assistant-panel"
            role="dialog"
            aria-label="Ariel, Eddie's portfolio assistant"
            aria-hidden="true"
        >
            <div class="assistant-panel-header">
                <div>
                    <p class="assistant-panel-label">Ariel</p>
                    <h3>Eddie&apos;s Portfolio Assistant</h3>
                </div>

                <button
                    id="assistantClose"
                    class="assistant-close"
                    type="button"
                    aria-label="Close Ariel"
                >
                    ×
                </button>
            </div>

            <p class="assistant-panel-description">
                Ask about Eddie&apos;s research, projects, presentations, skills, or certifications.
            </p>

            <div id="assistantMessages" class="assistant-messages" aria-live="polite">
                <div class="assistant-message assistant-message-bot">
                    Hi, I&apos;m Ariel, Eddie&apos;s portfolio assistant. Ask me anything about his portfolio.
                </div>
            </div>

            <form id="assistantForm" class="assistant-form">
                <input
                    id="assistantInput"
                    type="text"
                    placeholder="Ask a question..."
                    autocomplete="off"
                    required
                />

                <button id="assistantSubmit" type="submit">
                    Ask
                </button>
            </form>

            <p id="assistantStatus" class="assistant-status"></p>
        </div>
    `;

    document.body.appendChild(assistantWidget);
}