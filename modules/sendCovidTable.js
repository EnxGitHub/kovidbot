const convertData = require("./convertData");
const longMessage = require("./longMessage");
const axios = require("axios");
const _ = require("lodash");
require("dotenv").config();

function sendCovidTable(data, bot) {
    axios
        .get(
            "https://kovidbot.herokuapp.com" +
                process.env.SEEAD +
                process.env.SECRET,
        )
        .then((ads) => {
            axios
                .get(
                    "https://kovidbot.herokuapp.com" +
                        process.env.GET +
                        process.env.SECRET,
                )
                .then((people) => {
                    people["data"].forEach((person) => {
                        const chatId = person["_id"];
                        Promise.resolve(
                            bot.sendMessage(
                                chatId,
                                longMessage.daily(convertData(data), false),
                            ),
                        ).then(() => {
                            if (!person["pro"]) {
                                const ad = _.sample(ads["data"]);
                                if (ad) {
                                    Promise.resolve(
                                        bot.sendPhoto(chatId, ad["imgurl"], {
                                            caption: ad["message"].join("\n"),
                                        }),
                                    );
                                }
                            }
                        });
                    });
                });
        });
}

module.exports = sendCovidTable;
