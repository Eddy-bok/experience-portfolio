const ASSISTANT_API_URL = "https://eddie-portfolio-ai-api-9516.azurewebsites.net/ask";

document.addEventListener("DOMContentLoaded", () => {
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
            openAssistant();
        }
    });

    if (calloutButton) {
    calloutButton.addEventListener("click", () => {
        openAssistant();
    });
    }

    closeButton.addEventListener("click", () => {
        closeAssistant();
    });

    if (openAssistantLink) {
        openAssistantLink.addEventListener("click", (event) => {
            event.preventDefault();
            openAssistant();
        });
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const question = input.value.trim();

        if (!question) {
            return;
        }

        addMessage("user", question);
        input.value = "";

        setLoading(true, "Thinking...");

        try {
            const response = await fetch(ASSISTANT_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question,
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

            addMessage(
                "assistant",
                data.answer || "I could not generate an answer."
            );

        } catch (error) {
            console.error("Assistant API error:", error);

            addMessage(
                "assistant",
                "I could not reach Ariel right now. Please try again in a moment."
            );

        } finally {
            setLoading(false, "");
            input.focus();
        }
    });

    function openAssistant() {
        widget.classList.add("assistant-open");
        toggleButton.setAttribute("aria-expanded", "true");

        const panel = document.getElementById("assistantPanel");

        if (panel) {
            panel.setAttribute("aria-hidden", "false");
        }

        setTimeout(() => {
            input.focus();
        }, 100);
    }

    function closeAssistant() {
        widget.classList.remove("assistant-open");
        toggleButton.setAttribute("aria-expanded", "false");

        const panel = document.getElementById("assistantPanel");

        if (panel) {
            panel.setAttribute("aria-hidden", "true");
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

    function setLoading(isLoading, message) {
        submitButton.disabled = isLoading;
        input.disabled = isLoading;
        status.textContent = message;
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
