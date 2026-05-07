const app = express();

const PORT = process.env.PORT || 3000;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

app.use(express.json());

app.use(express.static(path.join(__dirname)));

function buildPrompt(selected, desc) {
    let prompt = "Порекомендуй один конкретный фильм";
    if (selected.length) prompt += ` в жанре: ${selected.join(", ")}`;
    if (desc) prompt += `. Запрос пользователя: "${desc}"`;
    prompt += `\n\nОтветь СТРОГО в JSON без markdown и без \`\`\`, вот структура:
{
  "title": "Название на русском",
  "original_title": "Оригинальное название",
  "year": 2019,
  "genres": ["Жанр1", "Жанр2"],
  "rating": 8.3,
  "duration": "2 ч 15 мин",
  "director": "Имя режиссёра",
  "cast": "Главные актёры через запятую",
  "description": "Краткое описание сюжета (2-3 предложения)",
  "why": "Почему именно этот фильм подходит под запрос (1 предложение)",
  "similar": ["Похожий фильм 1", "Похожий фильм 2", "Похожий фильм 3"]
}`;
    return prompt;
}


app.post("/api/recommend", async (req, res) => {
    try {
        if (!ANTHROPIC_API_KEY) {
            return res.status(500).json({ error: "ANTHROPIC_API_KEY не задан на сервере" });
        }


        const selected = Array.isArray(req.body?.selected) ? req.body.selected : [];
        const desc = String(req.body?.desc || "").trim();


        if (!selected.length && !desc) {
            return res.status(400).json({ error: "Нужен жанр или текст запроса" });
        }


        const prompt = buildPrompt(selected, desc);

        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                messages: [{ role: "user", content: prompt }]
            })
        });


        const data = await response.json();
        const text = (data.content || []).map((i) => i.text || "").join("").replace(/```json|```/g, "").trim();
        const movie = JSON.parse(text);
        res.json(movie);
    } catch (error) {
        res.status(500).json({ error: "Не удалось получить рекомендацию" });
    }
});


app.get("*", (_req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


app.listen(PORT, () => {
    console.log(`CineMatch запущен на порту ${PORT}`);
});
