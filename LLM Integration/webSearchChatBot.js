import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import readline from "node:readline";


// ============================================================
// 1. CLIENTS
// ============================================================

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const tvly = tavily({
    apiKey: process.env.TAVILY_API_KEY,
});


// ============================================================
// 2. TOOL FUNCTIONS
// ============================================================

const webSearch = async ({ query }) => {
    // Validate query
    if (!query || typeof query !== "string") {
        return {
            success: false,
            error: "A valid search query is required",

        };
    }

    const searchQuery = query.trim();

    console.log("\n🔍 webSearch called");


    console.log("Query:", searchQuery);

    try {
        const searchResponse = await tvly.search(searchQuery);
        // Get search results
        const results = searchResponse.results || [];
        // No results found
        if (results.length === 0) {
            return {
                success: false,
                error: "No search results found",

            };

        }

        // Combine results into one clean string
        const formattedResults = results.map((result, index) => {

            return ` SEARCH RESULT ${index + 1} Title: ${result.title}
                 Content: ${result.content} Source: ${result.url} `;

        }).join("\n-------------------\n");

        return {
            success: true,
            data: formattedResults,

        };

    } catch (error) {
        console.error("❌ Web Search Error:", error.message);

        return {
            success: false,
            error: "Failed to perform web search",
        };
    }
};


// ============================================================
// 3. TOOL DEFINITIONS
// ============================================================

const tools = [
    {
        type: "function",
        function: {
            name: "webSearch",
            description:
                "Search the web for current, latest, real-time, or up-to-date information.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description:
                            "The search query.",
                    },
                },
                required: ["query"],
            },
        },
    },
];


// ============================================================
// 4. TOOL REGISTRY
// ============================================================

const toolRegistry = {
    webSearch,
};

// ============================================================
// 5. AGENT CONFIG
// ============================================================

const MODEL = "openai/gpt-oss-20b";

const MAX_ITERATIONS = 10;

// ============================================================
// 6. AGENT LOOP
// ============================================================

async function runAgent(messages) {
    let iteration = 0;
    while (iteration < MAX_ITERATIONS) {

        iteration++;
        console.log(`\n🤖 Agent Iteration: ${iteration}`);


        // ----------------------------------------------------
        // CALL LLM
        // ----------------------------------------------------

        const response = await groq.chat.completions.create({

            model: MODEL,
            messages,
            tools,
            tool_choice: "auto",

        });


        const assistantMessage = response.choices[0].message;


        // Add assistant response to conversation

        messages.push(assistantMessage);

        // ----------------------------------------------------
        // CHECK FOR TOOL CALLS
        // ----------------------------------------------------
        const toolCalls = assistantMessage.tool_calls;

        // No tool calls
        // Means final answer

        if (!toolCalls || toolCalls.length === 0) {

            return assistantMessage.content;

        }

        // ----------------------------------------------------
        // EXECUTE TOOL CALLS
        // ----------------------------------------------------
        console.log(`\n🛠️ Tools requested: ${toolCalls.length}`);

        let toolIndex = 0;

        while (toolIndex < toolCalls.length) {

            const toolCall = toolCalls[toolIndex];
            const toolName = toolCall.function.name;

            console.log("\n📞 Tool requested:", toolName);

            let result;


            try {

                const functionParams = JSON.parse(toolCall.function.arguments);
                console.log("📦 Arguments:", functionParams);
                const tool = toolRegistry[toolName];


                if (!tool) {
                    throw new Error(`Tool not found: ${toolName}`);

                }


                console.log("⚙️ Executing tool...");

                result = await tool(functionParams);

                console.log("✅ Tool completed");


            } catch (error) {
                console.error("❌ Tool Error:", error.message);


                result = {
                    success: false,
                    error:
                        error.message,
                };
            }
            // Add tool result
            messages.push({

                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
            });
            // Move to next tool
            toolIndex++;
        }
        // Loop continues
        // LLM receives tool results
    }

    throw new Error("Agent exceeded maximum iterations");

}

// ============================================================
// 7. CONVERSATION MEMORY
// ============================================================

const messages = [

    {
        role: "system",

        content: `
You are a helpful AI assistant.

You can answer normal questions directly.

Use the webSearch tool when the user asks about:

- Current information
- Latest information
- Recent events
- News
- Weather
- Live data
- Information that may have changed

Use previous conversation messages to understand
follow-up questions and maintain context.

Do not use webSearch when the answer does not require
current information.
`,
    },

];


// ============================================================
// 8. CLI CHAT INTERFACE
// ============================================================

const rl = readline.createInterface(
    {
        input: process.stdin,
        output: process.stdout,

    }
);


// ============================================================
// 9. CONTINUOUS CHAT LOOP
// ============================================================

function startChat() {

    rl.question("\n👤 You: ", async (userInput) => {
        // ------------------------------------------------
        // EXIT
        // ------------------------------------------------
        if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
            console.log("\n👋 Goodbye!");
            rl.close();
            return;

        }
        // ------------------------------------------------
        // ADD USER MESSAGE
        // ------------------------------------------------

        messages.push(
            {
                role: "user",
                content: userInput,

            }
        );
        try {

            console.log("\n🤖 Assistant is thinking...");
            // --------------------------------------------
            // RUN AGENT
            // --------------------------------------------

            const answer = await runAgent(messages);
            // --------------------------------------------
            // FINAL ANSWER
            // --------------------------------------------
            console.log("\n🤖 Assistant:");
            console.log(answer);

        } catch (error) {
            console.error("\n❌ Agent Error:");
            console.error(error.message);

        }
        // ------------------------------------------------
        // ASK NEXT QUESTION
        // ------------------------------------------------

        startChat();

    }

    );

}


// ============================================================
// 10. START APPLICATION
// ============================================================

console.log("\n🤖 AI Agent Started");
console.log("Type 'exit' or 'quit' to stop.");


startChat();