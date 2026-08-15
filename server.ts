import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize Gemini client lazily
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// AI Diagnosis API Endpoint
app.post("/api/gemini/diagnose", async (req, res) => {
  try {
    const { origins, destinations, costMatrix, solution, totalCost, isBalanced } = req.body;

    const ai = getGenAIClient();

    const prompt = `
你是一位精通运筹学、供应链管理和物流优化的专家，请对以下运输问题和调运方案进行深度 AI 实时诊断：

【基本参数】
- 产地列表 (${origins.length} 个): ${origins.map((o: any) => `${o.name} (供应量: ${o.supply})`).join(", ")}
- 销地列表 (${destinations.length} 个): ${destinations.map((d: any) => `${d.name} (需求量: ${d.demand})`).join(", ")}
- 产销平衡状态: ${isBalanced ? "产销平衡" : "产销不平衡"}
- 当前方案总运费成本: ¥${totalCost}

【调运矩阵分派表 (x_ij)】
${solution.map((row: number[], i: number) => 
  `产地 ${origins[i]?.name || `S${i+1}`}: ` + 
  row.map((val: number, j: number) => `→ 销地 ${destinations[j]?.name || `D${j+1}`}: ${val}`).join(" | ")
).join("\n")}

【单位运价表 (c_ij)】
${costMatrix.map((row: number[], i: number) => 
  `产地 ${origins[i]?.name || `S${i+1}`}: ` + 
  row.map((c: number, j: number) => `${c >= 99999 ? "禁运(M)" : `¥${c}`}`).join(" | ")
).join("\n")}

请以专业、条理清晰且富有洞察力的中文语言，输出 Markdown 格式的诊断报告，包含以下四大模块：
1. **方案评价与最优性诊断**：评估当前方案的经济性，说明运量分布特点与产能利用效率。
2. **运力瓶颈与高成本路线分析**：指出运费最高或运量最集中的关键干线与可能存在的物流风险/瓶颈。
3. **降本增效与改进建议**：提供具体的供应链调优建议（如扩建线路、协商运费、调整生产配额等）。
4. **决策风险与敏感性提示**：对油价波动、禁运风险或需求剧增等现实冲击给出风险预警与应对策略。
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "你是一个专业的运筹学与供应链物流专家，回答要专业、精准、易懂，结构化 Markdown 格式。",
      },
    });

    res.json({ success: true, diagnosis: response.text });
  } catch (error: any) {
    console.error("Gemini diagnosis error:", error);
    res.status(500).json({ success: false, error: error.message || "AI 诊断请求失败，请检查 GEMINI_API_KEY 配置。" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
