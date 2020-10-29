import telebot
import time
import urllib
import json
from datetime import date
from threading import Thread

TOKEN = "1128846573:AAEJD_eamcVecr4T11HEvwRftmca4r52kvE"
bot = telebot.TeleBot(TOKEN)

url = "https://covid19.saglik.gov.tr/covid19api?getir=sondurum"

people = [1155586242, 1221177293]


def gethtml(url, timeout=5):
    thesite = urllib.request.urlopen(url, timeout=timeout).read()
    return thesite.decode("utf8")


today = date.today().strftime("%d.%m.%Y")
newDay = True
def corona():
    global newDay
    global today
    while True:
        try:
            print("Checking")
            api = json.loads(gethtml(url))[0]
            if newDay:
                if today == api["tarih"]:
                    print("Now")
                    newDay = False
                    
                    for person in people:
                        bot.send_message(person, "🦠")
                        bot.send_message(person, f'''
                        Tarih {api["tarih"]}

    💉  Test        {api["gunluk_test"]}  
    😷  Vaka       {api["gunluk_vaka"]}  
    ☠  Vefat      {api["gunluk_vefat"]}  
    😁  İyileşen  {api["gunluk_iyilesen"]}  
            ''')

                else:
                    print("Not now")
            if today != date.today().strftime("%d.%m.%Y"):
                today = date.today().strftime("%d.%m.%Y")
                newDay = True

            print("Checked")
            time.sleep(1)
        except Exception as e:
            bot.send_message(1155586242, f"ERROR\n{e}")


@bot.message_handler(commands=["start"])
def start(message):
    bot.reply_to(message, "Hello There")

@bot.message_handler(commands=["chatid"])
def chatid(message):
    bot.reply_to(message, f"Your chat id is {message.chat.id}")

@bot.message_handler(commands=["giris"])
def giris(message):
    if message.chat.id in people:
        bot.send_message(message.chat.id, "👎🏻")
        bot.send_message(message.chat.id, "Zaten listede adınız bulunmakta")
    else:
        people.append(message.chat.id)
        bot.send_message(message.chat.id, "👌🏻")
        bot.send_message(message.chat.id, "Giriş başarıyla tamamlandı")

@bot.message_handler(commands=["cikis"])
def cikis(message):
    if message.chat.id in people:
        people.remove(message.chat.id)
        bot.send_message(message.chat.id, "👌🏻")
        bot.send_message(message.chat.id, "Çıkış başarıyla tamamlandı")
    else:
        bot.send_message(message.chat.id, "👎🏻")
        bot.send_message(message.chat.id, "Zaten listede adınız bulunmamakta")


@bot.message_handler(commands=["list"])
def lst(message):
    bot.reply_to(message, str(people))

    

def poll():
    while True:
        try:
            bot.polling()
        except Exception as e:
            print(e)
            time.sleep(5)

if __name__ == "__main__":
    Thread(target=poll).start()
    Thread(target=corona).start()


