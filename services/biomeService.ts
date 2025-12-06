import { GoogleGenAI, Content, Part } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION, getHistoryTool, calculateMetricsTool, logWorkoutTool } from "../constants";
import { getHistoryImpl, calculateMetricsImpl, logWorkoutImpl } from "./toolImpl";
import { Message, Sender } from "../types";

const getApiKey = () => {
    try {
        return process.env.API_KEY || '';
    } catch {
        return '';
    }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
};

export class BiomeService {
  private chatSession: any;

  constructor() {
    this.startNewSession([]);
  }

  public startNewSession(previousHistory: Message[] = []) {
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
        temperature: 0.2,
        tools: [
          { functionDeclarations: [getHistoryTool, calculateMetricsTool, logWorkoutTool] }
        ],
      },
      history: history
    });
  }

  public async sendMessage(
    userMessage: string, 
    onToolCall?: (toolName: string, args: any) => void
  ): Promise<Message[]> {
    
    const newMessages: Message[] = [];
    
    try {
      let response = await this.chatSession.sendMessage({
        message: userMessage
      });
      
      while (response.candidates && response.candidates[0].content.parts.some((p: Part) => !!p.functionCall)) {
        
        const parts = response.candidates[0].content.parts;
        const functionCalls = parts.filter((p: Part) => !!p.functionCall);

        const functionResponseParts: Part[] = [];

        for (const part of functionCalls) {
          const call = part.functionCall!;
          const { name, args, id } = call;

          if (onToolCall) onToolCall(name, args);

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

          newMessages.push({
            id: generateId(),
            sender: Sender.SYSTEM,
            text: `Executed ${name}`,
            toolCall: { name, args, result: resultString }
          });

          functionResponseParts.push({
            functionResponse: {
                id: id,
                name: name,
                response: { result: resultString }
            }
          });
        }

        response = await this.chatSession.sendMessage({
             message: functionResponseParts
        });
      }

      if (response.text) {
        newMessages.push({
          id: generateId(),
          sender: Sender.BIOME,
          text: response.text
        });
      }

    } catch (error) {
      console.error("Error in BiomeService:", error);
      newMessages.push({
        id: generateId(),
        sender: Sender.BIOME,
        text: "System Critical: Connection interrupted. Unable to process biometrics."
      });
    }

    return newMessages;
  }
}

export const biomeService = new BiomeService();