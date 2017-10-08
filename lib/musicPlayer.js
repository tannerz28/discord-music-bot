const BotState = require('./botState');
const ytdl = require("ytdl-core");

class MusicPlayer {
	constructor() {
		this.bot = null;
		this.youTubeApiKey = null;
		this.setYoutubeKey = (key) => {
			this.youTubeApiKey = key;
		};
		this.getVideoId = (string) => {
			var regex = /(?:\?v=|&v=|youtu\.be\/)(.*?)(?:\?|&|$)/;
			var matches = string.match(regex);

			if(matches) {
				return matches[1];
			} else {
				return string;
			}
		};
		this.playNextSong = () => {
			if(BotState.isQueueEmpty()) {
				BotState.textChannel.sendMessage("The queue is empty!");
			}

			var video_id = BotState.queue[0]["id"];
			var title = BotState.queue[0]["title"];
			var user = BotState.queue[0]["user"];

			BotState.nowPlaying["title"] = title;
			BotState.nowPlaying["user"] = user;

			BotState.textChannel.sendMessage('Now playing: "' + title + '" (requested by ' + user + ')');
			this.bot.user.setGame(title);

			var audio_stream = ytdl("https://www.youtube.com/watch?v=" + video_id);
			BotState.voiceHandler = BotState.voiceConnection.playStream(audio_stream);

			BotState.voiceHandler.once("end", reason => {
				BotState.voiceHandler = null;
				this.bot.user.setGame();
				if(!BotState.stopped && !BotState.isQueueEmpty()) {
					this.playNextSong();
				}
			});

			BotState.queue.splice(0,1);
		};
		this.addToQueue = (video, message, mute = false) => {
			var video_id = this.getVideoId(video);

			ytdl.getInfo("https://www.youtube.com/watch?v=" + video_id, (error, info) => {
				if(error) {
					message.reply("The requested video (" + video_id + ") does not exist or cannot be played.");
					console.log("Error (" + video_id + "): " + error);
				} else {
					BotState.queue.push({title: info["title"], id: video_id, user: message.author.username});
					if (!mute) {
						message.reply('"' + info["title"] + '" has been added to the queue.');
					}
					if(!BotState.stopped && !BotState.isPlaying() && BotState.queue.length === 1) {
						this.playNextSong();
					}
				}
			});
		};
		
		this.queuePlaylist = (id, message, token = '') => {
			request("https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=" + playlistId + "&key=" + yt_api_key + "&pageToken=" + pageToken, (error, response, body) => {
				var json = JSON.parse(body);
				if ("error" in json) {
					message.reply("An error has occurred: " + json.error.errors[0].message + " - " + json.error.errors[0].reason);
				} else if (json.items.length === 0) {
					message.reply("No videos found within playlist.");
				} else {
					for (var i = 0; i < json.items.length; i++) {
						this.addToQueue(json.items[i].snippet.resourceId.videoId, message, true)
					}
					if (json.nextPageToken == null){
						return;
					}
					this.queuePlaylist(playlistId, message, json.nextPageToken)
				}
			});
		};
		this.searchVideo = (message, query) => {
			request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, (error, response, body) => {
				var json = JSON.parse(body);
				if("error" in json) {
					message.reply("An error has occurred: " + json.error.errors[0].message + " - " + json.error.errors[0].reason);
				} else if(json.items.length === 0) {
					message.reply("No videos found matching the search criteria.");
				} else {
					this.addToQueue(json.items[0].id.videoId, message);
				}
			})
		};
	}
}

module.exports = (new MusicPlayer);