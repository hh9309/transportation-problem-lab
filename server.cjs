var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }
  return new import_genai.GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
app.post("/api/gemini/diagnose", async (req, res) => {
  try {
    const { origins, destinations, costMatrix, solution, totalCost, isBalanced } = req.body;
    const ai = getGenAIClient();
    const prompt = `
\u4F60\u662F\u4E00\u4F4D\u7CBE\u901A\u8FD0\u7B79\u5B66\u3001\u4F9B\u5E94\u94FE\u7BA1\u7406\u548C\u7269\u6D41\u4F18\u5316\u7684\u4E13\u5BB6\uFF0C\u8BF7\u5BF9\u4EE5\u4E0B\u8FD0\u8F93\u95EE\u9898\u548C\u8C03\u8FD0\u65B9\u6848\u8FDB\u884C\u6DF1\u5EA6 AI \u5B9E\u65F6\u8BCA\u65AD\uFF1A

\u3010\u57FA\u672C\u53C2\u6570\u3011
- \u4EA7\u5730\u5217\u8868 (${origins.length} \u4E2A): ${origins.map((o) => `${o.name} (\u4F9B\u5E94\u91CF: ${o.supply})`).join(", ")}
- \u9500\u5730\u5217\u8868 (${destinations.length} \u4E2A): ${destinations.map((d) => `${d.name} (\u9700\u6C42\u91CF: ${d.demand})`).join(", ")}
- \u4EA7\u9500\u5E73\u8861\u72B6\u6001: ${isBalanced ? "\u4EA7\u9500\u5E73\u8861" : "\u4EA7\u9500\u4E0D\u5E73\u8861"}
- \u5F53\u524D\u65B9\u6848\u603B\u8FD0\u8D39\u6210\u672C: \xA5${totalCost}

\u3010\u8C03\u8FD0\u77E9\u9635\u5206\u6D3E\u8868 (x_ij)\u3011
${solution.map(
      (row, i) => `\u4EA7\u5730 ${origins[i]?.name || `S${i + 1}`}: ` + row.map((val, j) => `\u2192 \u9500\u5730 ${destinations[j]?.name || `D${j + 1}`}: ${val}`).join(" | ")
    ).join("\n")}

\u3010\u5355\u4F4D\u8FD0\u4EF7\u8868 (c_ij)\u3011
${costMatrix.map(
      (row, i) => `\u4EA7\u5730 ${origins[i]?.name || `S${i + 1}`}: ` + row.map((c, j) => `${c >= 99999 ? "\u7981\u8FD0(M)" : `\xA5${c}`}`).join(" | ")
    ).join("\n")}

\u8BF7\u4EE5\u4E13\u4E1A\u3001\u6761\u7406\u6E05\u6670\u4E14\u5BCC\u6709\u6D1E\u5BDF\u529B\u7684\u4E2D\u6587\u8BED\u8A00\uFF0C\u8F93\u51FA Markdown \u683C\u5F0F\u7684\u8BCA\u65AD\u62A5\u544A\uFF0C\u5305\u542B\u4EE5\u4E0B\u56DB\u5927\u6A21\u5757\uFF1A
1. **\u65B9\u6848\u8BC4\u4EF7\u4E0E\u6700\u4F18\u6027\u8BCA\u65AD**\uFF1A\u8BC4\u4F30\u5F53\u524D\u65B9\u6848\u7684\u7ECF\u6D4E\u6027\uFF0C\u8BF4\u660E\u8FD0\u91CF\u5206\u5E03\u7279\u70B9\u4E0E\u4EA7\u80FD\u5229\u7528\u6548\u7387\u3002
2. **\u8FD0\u529B\u74F6\u9888\u4E0E\u9AD8\u6210\u672C\u8DEF\u7EBF\u5206\u6790**\uFF1A\u6307\u51FA\u8FD0\u8D39\u6700\u9AD8\u6216\u8FD0\u91CF\u6700\u96C6\u4E2D\u7684\u5173\u952E\u5E72\u7EBF\u4E0E\u53EF\u80FD\u5B58\u5728\u7684\u7269\u6D41\u98CE\u9669/\u74F6\u9888\u3002
3. **\u964D\u672C\u589E\u6548\u4E0E\u6539\u8FDB\u5EFA\u8BAE**\uFF1A\u63D0\u4F9B\u5177\u4F53\u7684\u4F9B\u5E94\u94FE\u8C03\u4F18\u5EFA\u8BAE\uFF08\u5982\u6269\u5EFA\u7EBF\u8DEF\u3001\u534F\u5546\u8FD0\u8D39\u3001\u8C03\u6574\u751F\u4EA7\u914D\u989D\u7B49\uFF09\u3002
4. **\u51B3\u7B56\u98CE\u9669\u4E0E\u654F\u611F\u6027\u63D0\u793A**\uFF1A\u5BF9\u6CB9\u4EF7\u6CE2\u52A8\u3001\u7981\u8FD0\u98CE\u9669\u6216\u9700\u6C42\u5267\u589E\u7B49\u73B0\u5B9E\u51B2\u51FB\u7ED9\u51FA\u98CE\u9669\u9884\u8B66\u4E0E\u5E94\u5BF9\u7B56\u7565\u3002
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "\u4F60\u662F\u4E00\u4E2A\u4E13\u4E1A\u7684\u8FD0\u7B79\u5B66\u4E0E\u4F9B\u5E94\u94FE\u7269\u6D41\u4E13\u5BB6\uFF0C\u56DE\u7B54\u8981\u4E13\u4E1A\u3001\u7CBE\u51C6\u3001\u6613\u61C2\uFF0C\u7ED3\u6784\u5316 Markdown \u683C\u5F0F\u3002"
      }
    });
    res.json({ success: true, diagnosis: response.text });
  } catch (error) {
    console.error("Gemini diagnosis error:", error);
    res.status(500).json({ success: false, error: error.message || "AI \u8BCA\u65AD\u8BF7\u6C42\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5 GEMINI_API_KEY \u914D\u7F6E\u3002" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
