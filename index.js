require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api"),
    bot = new TelegramBot(process.env.TOKEN, {
        polling: true,
    });
const express = require("express");
const bodyParser = require("body-parser");
const NewsAPI = require("newsapi");
const moment = require("moment-timezone");
const _ = require("lodash");
const axios = require("axios");
const checkCovid = require("./modules/checkCovid");
const mongo = require("./modules/mongo");
const helper = require("./modules/message");
const { getPeople, getAds } = require("./modules/mongo");
const longMessage = require("./modules/longMessage");
const convertData = require("./modules/convertData");
const getData = require("./modules/getData");
const cache = require("./modules/cache");
const getFullData = require("./modules/getFullData");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 8001;
const URL = process.env.baseURL || "http://localhost:" + PORT;
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Hello World");
});

app.get("/" + process.env.GETNEWS + process.env.SECRET, async (req, res) => {
    if (cache.cache["news"].length !== 0) {
        res.json(cache.cache["news"]);
    } else {
        const news = [];
        const response = await newsapi.v2.topHeadlines({
            q: "korona",
            country: "tr",
        });
        response["articles"].forEach((oneNew) => {
            news.push({
                title: oneNew["title"],
                description: oneNew["source"]["name"],
                thumb_url:
                    oneNew["urlToImage"] ||
                    "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/noimage.png",
                content: oneNew["description"],
                url: oneNew["url"],
            });
        });
        const response2 = await newsapi.v2.topHeadlines({
            q: "kovid",
            country: "tr",
        });
        response2["articles"].forEach((oneNew) => {
            news.push({
                title: oneNew["title"],
                description: oneNew["source"]["name"],
                thumb_url:
                    oneNew["urlToImage"] ||
                    "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/noimage.png",
                content: oneNew["description"],
                url: oneNew["url"],
            });
        });
        if (news.length === 0) {
            news.push({
                id: "1",
                type: "article",
                title:
                    "Şu an için kovid 19 salgını hakkında güncel haber bulunmamaktadır",
                description: "@kovidbot",
                thumb_url:
                    "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/profile-picture/tinykovidbot.png",
                message_text: longMessage.spread(query.from.first_name),
            });
        }
        res.json(news);
        cache.setNews(news);
    }
});

app.post("/" + process.env.ENTER + process.env.SECRET, async (req, res) => {
    const body = req.body;
    mongo.enter(
        bot,
        {
            _id: body["_id"],
            name: body["name"],
            time: moment().utc().valueOf(),
            pro: false,
        },
        helper.enter,
    );
    res.send("Done");
});
app.post("/" + process.env.LEAVE + process.env.SECRET, (req, res) => {
    const body = req.body;
    mongo.leave(bot, { _id: body["_id"], name: body["name"] }, helper.leave);
    res.send("Done");
});

app.get("/" + process.env.GET + process.env.SECRET, (req, res) => {
    getPeople((people) => {
        res.json(people);
    });
});

app.get("/" + process.env.GETADS + process.env.SECRET, (req, res) => {
    getAds((ads) => {
        res.json(ads);
    });
});
app.get("/" + process.env.GETDATA + process.env.SECRET + "/", (req, res) => {
    getData((data) => {
        if (cache.cache["full"]) {
            res.json(cache.cache["full"]);
        } else {
            cache.setFull(data);
            res.json(data);
        }
    });
});

app.get(
    "/" + process.env.GETDATA + process.env.SECRET + "/:get",
    (req, res) => {
        if (cache.cache["grafik"][req.params.get]) {
            res.json(cache.cache["grafik"][req.params.get]);
        } else {
            getFullData(req.params.get, (data) => {
                cache.setGrafik(req.params.get, data);
                res.json(data);
            });
        }
    },
);

app.get("/" + process.env.GETTODAY + process.env.SECRET, (req, res) => {
    if (cache.cache["tablo"]) {
        res.json(cache.cache["tablo"]);
    } else {
        getData((data) => {
            cache.setTablo(data[0]);
            res.json(data[0]);
        });
    }
});

app.post("/" + process.env.ADDAD + process.env.SECRET, (req, res) => {
    let body = req.body;
    body["_id"] = JSON.stringify(body);
    body["active"] = true;
    mongo.addAd(bot, body, (bot, data, ok, err) => {
        console.log(data);
        if (ok) {
            res.json({ ok: true });
        } else {
            res.json({ ok: false, err: err });
        }
    });
});

app.post("/" + process.env.REMOVEAD + process.env.SECRET, (req, res) => {
    let body = req.body;
    mongo.removeAd(bot, body, (bot, data, ok, err) => {
        if (ok) {
            res.json({ ok: true });
        } else {
            res.json({ ok: false, err: err });
        }
    });
});

Array.prototype.unique = function () {
    var a = this.concat();
    for (var i = 0; i < a.length; ++i) {
        for (var j = i + 1; j < a.length; ++j) {
            if (a[i] === a[j]) a.splice(j--, 1);
        }
    }

    return a;
};

const queryies = ["haber", "tablo"];

const newsapi = new NewsAPI(process.env.NEWS_API);

bot.onText(/\/start/, (message) => {
    bot.sendMessage(
        message.chat.id,
        `Merhaba ${message.from.first_name}! Lütfen yardım için /help yaz.`,
    );
});

bot.onText(/\/help/, (message) => {
    bot.sendMessage(message.chat.id, longMessage.help(message.from.first_name));
});

bot.onText(/\/giris/, (message) => {
    axios.post(`${URL}/${process.env.ENTER + process.env.SECRET}`, {
        _id: message.chat.id,
        name: message.from.first_name,
    });
});

bot.onText(/\/cikis/, (message) => {
    axios.post(`${URL}/${process.env.LEAVE + process.env.SECRET}`, {
        _id: message.chat.id,
        name: message.from.first_name,
    });
});

bot.onText(/\/list/, (message) => {
    let allPeople = [];
    if (message.from.username == process.env.ADMIN) {
        axios({
            method: "get",
            url: `${URL}/${process.env.GET + process.env.SECRET}`,
            responseType: "json",
        }).then((people) => {
            people["data"].forEach((person) => {
                allPeople.push(JSON.stringify(person));
            });
            bot.sendMessage(message.chat.id, allPeople.join("\n"));
        });
    } else {
        bot.sendMessage(
            message.chat.id,
            "Bu komutu kullanabilmek için admin olmalısınız",
        );
    }
});

bot.onText(/\/toplam/, (message) => {
    if (cache.cache["tablo"]) {
        bot.sendMessage(
            message.chat.id,
            longMessage.total(cache.cache["tablo"]),
        );
    } else {
        getFullData((data) => {
            cache.setTablo(data[0]);
            bot.sendMessage(
                message.chat.id,
                longMessage.total(cache.cache["tablo"]),
            );
        });
    }
});

bot.onText(/\/grafik/, (message, match) => {
    let msg = "";
    const get =
        "gunluk_" +
        (message.text.split(" ")[1] == "-"
            ? "vaka"
            : message.text.split(" ")[1] || "vaka");
    const h =
        message.text.split(" ")[2] == "-"
            ? 16
            : parseInt(message.text.split(" ")[2]) || 16;
    const w =
        message.text.split(" ")[3] == "-"
            ? 8
            : parseInt(message.text.split(" ")[3]) || 8;
    let allData = [];
    const sendGrafik = (data) => {
        allData = data;
        allData = _.chunk(
            allData,
            Math.ceil(allData.length / Math.min(allData.length, h)),
        );
        for (var i = 0; i < allData.length; i++) {
            allData[i] = _.sum(allData[i]) / allData[i].length;
        }
        var divideBy = _.max(allData) / w;
        for (var i = 0; i < allData.length; i++) {
            allData[i] = Math.ceil(allData[i] / divideBy);
        }

        const emojis = ["🟩", "🟨", "🟧", "🟥"];
        allData.forEach((day) => {
            msg +=
                emojis[
                    Math.min(
                        parseInt(day / (w / emojis.length)),
                        emojis.length - 1,
                    ) || 0
                ].repeat(Math.max(day, 1)) + "\n";
        });
        bot.sendMessage(
            message.chat.id,
            `${msg}
Daha detaylı bilgi için [@kovidbot websitesini](https://kovidbot.web.app) ziyaret edebilirsiniz.`,
            { parse_mode: "Markdown", disable_web_page_preview: true },
        );
    };
    if (cache.cache["grafik"][get]) {
        sendGrafik(cache.cache["grafik"][get]);
    } else {
        getFullData(get, (data) => {
            sendGrafik(data);
            cache.setGrafik(get, data);
        });
    }
});

bot.on("inline_query", (query) => {
    const data = query.query;
    if (!queryies.includes(data)) {
        bot.answerInlineQuery(query.id, [
            {
                id: "0",
                type: "article",
                title: `Merhaba ${query.from.first_name}. Lütfen tablo ya da haber yaz.`,
                description: "Ya da bana tıklayabilirsin?",
                thumb_url:
                    "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/profile-picture/tinykovidbot.png",
                message_text: longMessage.spread(query.from.first_name),
            },
        ]);
    } else {
        if (data == "tablo") {
            function sendCovidTable(table) {
                let isToday = "";
                const covid = convertData(table);

                if (
                    covid["date"] == moment().tz("Turkey").format("DD.MM.YYYY")
                ) {
                    isToday = "(bugün)";
                }
                bot.answerInlineQuery(query.id, [
                    {
                        id: "0",
                        type: "article",
                        title: `📅 ${covid["date"]} ${isToday} 📅`,
                        thumb_url:
                            "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/image.png",
                        message_text: longMessage.daily(covid, true),
                    },
                ]);
            }
            function getAndSendCovidData() {
                if (cache["grafik"]) {
                    const covid = cache["grafik"];
                    sendCovidTable(covid);
                } else {
                    getData((temp) => {
                        const covid = temp[0];
                        sendCovidTable(covid);
                    });
                }
            }
            getAndSendCovidData();
        }
        if (data == "haber") {
            if (cache.cache["news"].length !== 0) {
                bot.answerInlineQuery(query.id, cache.cache["news"]);
            } else {
                let news = [];
                newsapi.v2
                    .topHeadlines({
                        q: "korona",
                        country: "tr",
                    })
                    .then((response) => {
                        response["articles"].forEach((oneNew) => {
                            news.push({
                                id: String(
                                    response["articles"].indexOf(oneNew),
                                ),
                                type: "article",
                                title: oneNew["title"],
                                description: oneNew["source"]["name"],
                                thumb_url:
                                    oneNew["urlToImage"] ||
                                    "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/noimage.png",
                                message_text: `${oneNew["description"]}\n\nHaberin tamamına ulaşmak için tıklayın: ${oneNew["url"]}\n\nBu haber https://t.me/kovidbot aracılığıyla gönderildi`,
                            });
                        });
                        newsapi.v2
                            .topHeadlines({
                                q: "kovid",
                                country: "tr",
                            })
                            .then((response2) => {
                                response2["articles"].forEach((oneNew) => {
                                    news.push({
                                        id: String(
                                            response2["articles"].indexOf(
                                                oneNew,
                                            ) + response["totalResults"],
                                        ),
                                        type: "article",
                                        title: oneNew["title"],
                                        description: oneNew["source"]["name"],
                                        thumb_url:
                                            oneNew["urlToImage"] ||
                                            "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/noimage.png",
                                        message_text: `${oneNew["description"]}\n\nHaberin tamamına ulaşmak için tıklayın: ${oneNew["url"]}\n\nBu haber https://t.me/kovidbot aracılığıyla gönderildi`,
                                    });
                                });
                                if (news.length === 0) {
                                    news.push({
                                        id: "1",
                                        type: "article",
                                        title:
                                            "Şu an için kovid 19 salgını hakkında güncel haber bulunmamaktadır",
                                        description: "@kovidbot",
                                        thumb_url:
                                            "https://raw.githubusercontent.com/EnxGitHub/kovidbot/main/profile-picture/tinykovidbot.png",
                                        message_text: longMessage.spread(
                                            query.from.first_name,
                                        ),
                                    });
                                }
                                bot.answerInlineQuery(query.id, news);
                                cache.setNews[news];
                            });
                    });
            }
        }
    }
});
bot.on("polling_error", console.log);
checkCovid(2, bot);

app.listen(PORT, () => {
    console.log(URL, "App listening on port", PORT);
});
