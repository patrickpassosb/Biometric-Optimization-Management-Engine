import { GoogleGenAI, Content, Part } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, getHistoryTool, calculateMetricsTool, logWorkoutTool } from "../constants";
import { getHistoryImpl, calculateMetricsImpl, logWorkoutImpl } from "./toolImpl";
import { Message, Sender } from "../types";

// Initialize the API client
// Note: process.env.API_KEY is required by the prompt instructions.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export class BiomeService {
  private chatSession: any;

  constructor() {
    this.startNewSession([]);
  }

  public startNewSession(previousHistory: Message[] = []) {
    // Map UI messages to GenAI Content format to restore context
    // We only restore USER and BIOME messages (text) to avoid complex tool state reconstruction
    const history: Content[] = previousHistory
      .filter(m => m.sender === Sender.USER || m.sender === Sender.BIOME)
      .map(m => ({
        role: m.sender === Sender.USER ? 'user' : 'model',
        parts: [{ text: m.text }] as Part[]
      }));

    this.chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.2, // Low temp for analytical precision
        tools: [
          { functionDeclarations: [getHistoryTool, calculateMetricsTool, logWorkoutTool] }
        ],
      },
      history: history
    });
  }

  /**
   * Sends a message to Gemini and handles the tool execution loop.
   */
  public async sendMessage(
    userMessage: string, 
    onToolCall?: (toolName: string, args: any) => void
  ): Promise<Message[]> {
    
    const newMessages: Message[] = [];
    
    try {
      let response = await this.chatSession.sendMessage({
        message: userMessage
      });

      // Loop to handle potential multiple tool calls or sequential tool calls
      // The SDK and model might return a function call. We need to execute it and send the result back.
      
      while (response.candidates && response.candidates[0].content.parts.some((p: Part) => !!p.functionCall)) {
        
        const parts = response.candidates[0].content.parts;
        const functionCalls = parts.filter((p: Part) => !!p.functionCall);

        // We need to construct a response with function responses
        // The SDK expects an array of Parts, where each part is a functionResponse
        const functionResponseParts: Part[] = [];

        for (const part of functionCalls) {
          const call = part.functionCall!;
          const { name, args, id } = call;

          // Notify UI
          if (onToolCall) onToolCall(name, args);

          // Execute Local Logic
          let resultString = "";
          console.log(`[Biome] Executing tool: ${name}`, args);

          if (name === "get_history") {
            resultString = getHistoryImpl(args.exercise_name);
          } else if (name === "calculate_metrics") {
            resultString = calculateMetricsImpl(args.history_data);
          } else if (name === "log_workout") {
            resultString = logWorkoutImpl(args);
          } else {
            resultString = JSON.stringify({ error: "Unknown tool" });
          }

          // Add to message history for UI
          newMessages.push({
            id: crypto.randomUUID(),
            sender: Sender.SYSTEM,
            text: `Executed ${name}`,
            toolCall: { name, args, result: resultString }
          });

          // Correct structure for GenAI SDK: Part[] with functionResponse
          functionResponseParts.push({
            functionResponse: {
                id: id,
                name: name,
                response: { result: resultString }
            }
          });
        }

        // Send the tool results back to the model
        // The model will then generate the next part of the conversation (or another tool call)
        response = await this.chatSession.sendMessage({
             message: functionResponseParts
        });
      }

      // Final text response
      if (response.text) {
        newMessages.push({
          id: crypto.randomUUID(),
          sender: Sender.BIOME,
          text: response.text
        });
      }

    } catch (error) {
      console.error("Error in BiomeService:", error);
      newMessages.push({
        id: crypto.randomUUID(),
        sender: Sender.BIOME,
        text: "System Critical: Connection interrupted. Unable to process biometrics."
      });
    }

    return newMessages;
  }
}

export const biomeService = new BiomeService();