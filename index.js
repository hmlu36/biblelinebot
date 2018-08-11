'use strict';

var linebot = require('linebot');
var express = require('express');
const app = express();


const defaultAccessToken = '***********************';
const defaultSecret = '***********************';

//========================================================
// 設定資料
//========================================================
var bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET || defaultSecret,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN || defaultAccessToken
});

var BibleObject = require('./bible.js');

//========================================================
// 導頁網址
//========================================================
app.get('/', (req, res) => {
  res.send('Hello World!');
});

const linebotParser = bot.parser();
app.post('/callback', linebotParser);

//========================================================
// 處理監聽訊息
//========================================================
bot.on('message', function (event) {
	event.reply(analysisInput(event.message.text))
	.then(function (data) {
		// success
	}).catch(function (error) {
		console.log(error);
	});
});

app.listen(process.env.PORT || 3000, () => {
	console.log('Example app listening on port 3000!')
})

function analysisInput(input) {
	
	if (input.indexOf("小幫手") !== -1) {
		return ["小幫手來囉~👼🏼\n需要甚麼協助!?🙏🏼",
				"",
                "聖經查詢 \"(默想經文) 目錄章:起-訖,節\"",
				"範例：默想經文 創1:1-2, 20",
				"[目錄] 可輸入全名或縮寫",
				"[章節] 不輸入會列出全章",
				"      不同節也能用逗號分隔，也可不輸入",
				"[默想經文] 可不輸入",
				"輸入會加入\"今日默想經文 月/日\"",
				"",
				"關鍵字查詢 \"關鍵字 查詢字 (起始目錄) (結束目錄)\"",
				"範例：關鍵字 戶勒大 王上 代下",
				"啟始結束章節未輸入預設為全部",
				"符合經文最多列出30列",
				"",
				"以上希望有幫到您~☺️"].join('\n');
	} else if (input.indexOf("log") !== -1) {
		return "https://dashboard.heroku.com/apps/biblelinebot/logs";
	} else if (input.indexOf("heroku") !== -1) {
		return "https://dashboard.heroku.com/apps/biblelinebot";	
	} else if (input.indexOf("後台") !== -1) {
		return "https://developers.line.me/console/";
	} else if (input.indexOf("官方帳號") !== -1) {
		return "https://admin-official.line.me/";
	} else if (input.indexOf("關鍵字") !== -1) {
		var content = BibleObject.getSearchContent(input.replace("關鍵字 ", ""));
		return !content ? "查無資料耶~ 😅" : content;
	} else {
		var content = BibleObject.getReadingContent(input.replace("默想經文", ""));
		if (!content) {
			return "查無資料耶~ 😅";
		} else {
			if (input.indexOf("默想經文") !== -1) {
				content = "今日默想經文 " + getDateString() + "\n" + content;
			}
			return content;
		}
	}
}



function getDateString() {
	var now = new Date();
	now.setHours(now.getHours() + 8);
	return (now.getMonth()+1) + "/" + now.getDate();
}