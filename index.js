//Made by _programmeKid

//Variables
var discord = require("discord.js");
var request = require("request");
var booru = require("booru");
var dbjson = require("./database.json");
var fs = require("fs");
var ytdl = require("ytdl-core");
var client = new discord.Client();
var rule34 = new booru("rule34");
var prefix = process.env.prefix;
var token = process.env.token;
var dbpass = process.env.dbpass;
var playing = false;
var currentdispatcher;

//Functions
function random(min,max){
	return Math.floor(Math.random() * (max-min+1)) + min;
}

function isAdmin(user){
	if(user.roles.find("id","503414466021556226") || user.roles.find("id","502610716650635284")){
		return true;
	} else{
		return false;
	}
}

function getMeme(deepfried){
	return new Promise((resolve,reject) => {
		let url;
		if(deepfried){
			url = "https://www.reddit.com/r/DeepFriedMemes/new.json?sort=new";
		} else{
			url = "https://www.reddit.com/r/dankmemes/new.json?sort=new";
		}
		request(url,(err,res,body) => {
			let json = JSON.parse(body);
			let posts = json.data.children;
			let post = posts[random(0,posts.length)];
			while(post == undefined){
				post = posts[random(0,posts.length)];
			}
			resolve({
				text: post.data.title,
				image: post.data.url
			});
		});
	});
}

function goCommitDie(){
	return new Promise((resolve,reject) => {
		request("https://www.reddit.com/r/gocommitdie/new.json?sort=new",(err,res,body) => {
			let json = JSON.parse(body);
			let posts = json.data.children;
			let post = posts[random(0,posts.length)];
			resolve({
				text: post.data.title,
				image: post.data.url
			});
		});
	});
}

function getHentai(tags){
	return new Promise((resolve,reject) => {
		rule34.search(tags,{limit: 10})
			.then(imgs => {
				if(imgs[0]){
					let tab = [];
					for(let i = 0; i < imgs.length; i++){
						tab.push(imgs[i].common.file_url);
					}
					resolve(tab);
				} else{
					resolve("Nothing found");
				}
			})
			.catch(console.log);
	});
}

function DBGetUser(user){
	return new Promise((resolve,reject) => {
		request({
			url: "https://conk-database.herokuapp.com/db",
			body: {
				cmd: "getuser",
				args: {
					user: user,
					auth: dbpass
				}
			}
		},(err,res,body) => {
			resolve(JSON.parse(body));
		});
	});
}

function DBSetUser(user,newentry){
	return new Promise((resolve,reject) => {
		request({
			url: "https://conk-database.herokuapp.com/db",
			body: {
				cmd: "setuser",
				args: {
					user: user,
					newentry: newentry,
					auth: dbpass
				}
			}
		},(err,res,body) => {
			resolve(body);
		});
	});
}

function getCoins(user){
	return new Promise((resolve,reject) => {
		DBGetUser(user)
			.then(dbentry => {
				resolve(dbentry.coins);
			})
			.catch(console.log);
	});
}

function addCoins(user,amount){
	DBGetUser(user)
		.then(dbentry => {
			dbentry.coins += amount;
			DBSetUser(user,dbentry);
		})
		.catch(console.log);
}

function takeCoins(user,amount){
	DBGetUser(user)
		.then(dbentry => {
			dbentry.coins -= amount;
			if(dbentry.coins >= 0){
				DBSetUser(user,dbentry);
			}
		})
		.catch(console.log);
}

//Events
client.on("ready",() => {
	console.log("Client ready!");
	client.user.setActivity("with my dick, fuck you.");
});

client.on("guildMemberAdd",member => {
	DBGetUser("id-" + member.id)
		.then(() => {
			let channel = member.guild.channels.find("name","general");
			channel.send("Welcome, **" + member.user.username + "**. Enjoy the squeaking of all the squeakers in this server.");
			member.addRole("502610628964384771");
		})
		.catch(console.log);
});

client.on("guildMemberRemove",member => {
	let channel = member.guild.channels.find("name","general");
	channel.send("Bye, **" + member.user.username + "**. We'll miss you :sob:.");
});

client.on("message",msg => {
	if(msg.author.bot) return;

	if(msg.content.charAt(0) == prefix){
		let cmdtable = msg.content.split(" ");
		let cmd = cmdtable[0].toLowerCase();
		let args = cmdtable.slice(1);

		try{
			if(cmd == prefix + "ping"){
				msg.channel.send("Pong!")
					.then(newmsg => {
						newmsg.edit("Pong! **" + (Date.now()-newmsg.createdTimestamp) + " ms**");
					})
					.catch(console.log);
			} else if(cmd == prefix + "help"){
				msg.channel.send({
					embed: {
						title: "Commands",
						fields: [
							{
								name: "Basic commands",
								value: "**" + prefix + "ping** | Pings discord.\n**" + prefix + "invite** | Generates an invite link which gives you coins when used.\n**" + prefix + "version** | Displays bot version.\n**" + prefix + "source** | Programmed perfection :ok_hand:\n**" + prefix + "website** | For our website"
							},
							{
								name: "Fun commands",
								value: "**" + prefix + "meme <deepfried>** | Shows a MEME!\n**" + prefix + "inspirationalquote** | Shows an inspirational quote.\n**" + prefix + "gocommitdie** | Just go commit neck rope or some shit.\n**" + prefix + "hentai <tags>** | Gives you hentai (use this in #nsfw-bot)"
							},
							{
								name: "Currency commands",
								value: "**" + prefix + "coins** | Shows your squeaker coin balance\n**" + prefix + "shop** | DM's you a list of buyable items\n**" + prefix + "buy <shopnum>** | Buys an item from the shop."
							},
							{
								name: "Music commands",
								value: "**" + prefix + "play <youtube url>** | Plays a song.\n**" + prefix + "pause** | Pauses song.\n**" + prefix + "stop** | Stops song and disconnects."
							},
							{
								name: "Admin commands",
								value: "**" + prefix + "kick <user>** | Kicks a user.\n**" + prefix + "ban <user>** | Bans a user.\n**" + prefix + "say <msg>** | Says something with the bot.\n**" + prefix + "eval <code>** | Evaluates code.\n**" + prefix + "kill** | Takes the bot offline."
							}
						],
						footer: {
							text: "page 1/1"
						}
					}
				});
			} else if(cmd == prefix + "meme"){
				let deepfried;
				if(args[0] == "true"){
					deepfried = true;
				} else if(args[0] == "false"){
					deepfried = false;
				} else{
					deepfried = false;
				}
				getMeme(deepfried)
					.then(meme => {
						msg.channel.send(meme.text,{
							files: [
								meme.image
							]
						});
					})
					.catch(console.log);
			} else if(cmd == prefix + "inspirationalquote"){
				request("http://inspirobot.me/api?generate=true&oy=vey",(err,res,body) => {
					msg.channel.send({
						files: [
							body
						]
					});
				});
			} else if(cmd == prefix + "meem"){
				msg.channel.send(":no_entry_sign: Error: You spelled \"meme\" wrong you fucking idiot.");
			} else if(cmd == prefix + "kick"){
				if(isAdmin(msg.member)){
					let member = msg.mentions.members.first();
					if(!member){
						msg.channel.send(":no_entry_sign: Error: Please provide a user to kick.");
					} else{
						if(member.kickable){
							member.kick();
						} else{
							msg.channel.send(":no_entry_sign: Error: Unable to kick user.");
						}
					}
				}
			}  else if(cmd == prefix + "ban"){
				if(isAdmin(msg.member)){
					let member = msg.mentions.members.first();
					if(!member){
						msg.channel.send(":no_entry_sign: Error: Please provide a user to ban.");
					} else{
						if(member.bannable){
							member.ban();
						} else{
							msg.channel.send(":no_entry_sign: Error: Unable to ban user.");
						}
					}
				}
			} else if(cmd == prefix + "say"){
				if(isAdmin(msg.member)){
					msg.channel.send(args.join(" "))
						.then(() => {
							msg.delete();
						})
						.catch(console.log);
				}
			} else if(cmd == prefix + "play"){
				if(!playing){
					if(args[0]){
						let voiceChannel = msg.member.voiceChannel;
						if(voiceChannel){
							voiceChannel.join()
								.then(con => {
									let streamOptions = {
										seek: 0,
										volume: 1
									};
									let stream = ytdl(args[0],{
										filter: "audioonly"
									});
									currentdispatcher = con.playStream(stream);
									playing = true;
									currentdispatcher.on("end",() => {
										voiceChannel.leave();
										playing = false;
										currentdispatcher = undefined;
									});
								})
								.catch(console.log);
						} else{
							msg.channel.send(":no_entry_sign: Error: Please provide a YouTube link.");
						}
					} else{
						if(currentdispatcher){
							currentdispatcher.resume();
						}
					}
				} else{
					if(currentdispatcher){
						currentdispatcher.resume();
					}
				}
			} else if(cmd == prefix + "pause"){
				if(currentdispatcher){
					currentdispatcher.pause();
					playing = false;
				} else{
					msg.channel.send(":no_entry_sign: Error: Nothing is playing.");
				}
			} else if(cmd == prefix + "stop"){
				if(currentdispatcher){
					currentdispatcher.end();
					playing = false;
				} else{
					msg.channel.send(":no_entry_sign: Error: Nothing is playing.");
				}
			} else if(cmd == prefix + "gocommitdie"){
				goCommitDie()
					.then(die => {
						msg.channel.send(die.text,{
							files: [
								die.image
							]
						});
					})
					.catch(console.log);
			} else if(cmd == prefix + "coins"){
				getCoins(msg.member)
					.then(coins => {
						msg.channel.send("You have **" + coins + "** squeaker coins.");
					})
					.catch(console.log);
			} else if(cmd == prefix + "shop"){
				msg.author.send({
					embed: {
						title: "Shop",
						fields: [
							{
								name: "1) Smol Squeaker",
								value: "Description: This role is for those who are overall good squeakers.\nPrice: 200 squeaker coins"
							},
							{
								name: "2) High-Pitched Squeaker",
								value: "Description: If your voice is **very high-pitched**, then this role is for you.\nPrice: 400 squeaker coins"
							},
							{
								name: "3) Hacker Squeaker",
								value: "Description: There are some very skilled hackers out there. Not everyone knows this, but some of the best are squeakers.\nPrice: 600 squeaker coins"
							},
							{
								name: "4) Yeet Squeaker",
								value: "Description: YEETUS THAT FETUS!!! FETUS DELETUS ABORTION COMPLETUS!!!\nPrice: 800 squeaker coins"
							},
							{
								name: "5) \"Your Mom\" Squeaker",
								value: "Description: Guess what I fucked your mom.\nPrice: 1000 squeaker coins"
							}
						],
						footer: {
							text: "Do !buy <shopnuber> to buy something"
						}
					}
				});
				msg.channel.send("DM'd you a list of buyable items");
			} else if(cmd == prefix + "buy"){
				getCoins(msg.member)
					.then(coins => {
						if(args[0]){
							let shopitem = parseInt(args[0]);
							if(shopitem){
								if(shopitem == 1){
									if(coins >= 200){
										msg.member.addRole("505925160038170644");
										takeCoins(msg.member,200);
										msg.channel.send("Bought **Smol Squeaker** for **200** squeaker coins.");
									} else{
										msg.channel.send(":no_entry_sign: Error: You don't have enough money for that.");
									}
								} else if(shopitem == 2){
									if(coins >= 400){
										msg.member.addRole("505925298802524181");
										takeCoins(msg.member,400);
										msg.channel.send("Bought **High-Pitched Squeaker** for **400** squeaker coins.");
									} else{
										msg.channel.send(":no_entry_sign: Error: You don't have enough money for that.");
									}
								} else if(shopitem == 3){
									if(coins >= 600){
										msg.member.addRole("505925545465479182");
										takeCoins(msg.member,600);
										msg.channel.send("Bought **Hacker Squeaker** for **600** squeaker coins.");
									} else{
										msg.channel.send(":no_entry_sign: Error: You don't have enough money for that.");
									}
								} else if(shopitem == 4){
									if(coins >= 800){
										msg.member.addRole("505925770770776064");
										takeCoins(msg.member,800);
										msg.channel.send("Bought **Yeet Squeaker** for **800** squeaker coins.");
									} else{
										msg.channel.send(":no_entry_sign: Error: You don't have enough money for that.");
									}
								} else if(shopitem == 5){
									if(coins >= 1000){
										msg.member.addRole("505925919748390923");
										takeCoins(msg.member,1000);
										msg.channel.send("Bought **\"Your Mom\" Squeaker** for **1000** squeaker coins.");
									} else{
										msg.channel.send(":no_entry_sign: Error: You don't have enough money for that.");
									}
								}
							}
						}
					})
					.catch(console.log);
			} else if(cmd == prefix + "invite"){
				msg.channel.createInvite({maxAge: 0, unique: true})
					.then(invite => {
						msg.channel.send("Send this invite link to your friends: `" + invite.url + "`.");
					})
					.catch(console.log);
			} else if(cmd == prefix + "eval"){
				if(isAdmin(msg.member)){
					eval(args.join(" "));
					msg.channel.send("Executed code!");
				}
			} else if(cmd == prefix + "kill"){
				if(isAdmin(msg.member)){
					msg.channel.send("Offline!");
					setTimeout(() => {
						process.exit(0);
					},1000);
				}
			} else if(cmd == prefix + "version"){
				msg.channel.send("v0.5.9 Alpha (WIP)");
			} else if(cmd == prefix + "source"){
				msg.channel.send("Programmed perfection :ok_hand:\nhttps://github.com/DrProgrammedChild/conk-bot");
			} else if(cmd == prefix + "hentai"){
				getHentai(args)
					.then(imgs => {
						if(imgs != "Nothing found"){
							imgs.forEach(img => {
								msg.channel.send({
									files: [
										img
									]
								});
							});
						} else{
							msg.channel.send(imgs);
						}
					})
					.catch(console.log);
			} else if(cmd == prefix + "website"){
				msg.channel.send("Go here for our bullshit\nhttps://conk-bot.herokuapp.com/");
			} else if(cmd == prefix + "addcoins"){
				let member = msg.mentions.members.first();
				if(member){
					if(args[1]){
						let coins = parseInt(args[1]);
						if(coins){
							addCoins(member,coins);
							msg.channel.send("Gave coins successfully!");
						} else{
							msg.channel.send(":no_entry_sign: Error: Please enter valid coin amount.");
						}
					} else{
						msg.channel.send(":no_entry_sign: Error: Please enter valid coin amount.");
					}
				} else{
					msg.channel.send(":no_entry_sign: Error: Please provide a user to give coins.");
				}
			} else if(cmd == prefix + "takecoins"){
				let member = msg.mentions.members.first();
				if(member){
					if(args[1]){
						let coins = parseInt(args[1]);
						if(coins){
							takeCoins(member,coins);
							msg.channel.send("Took coins successfully!");
						} else{
							msg.channel.send(":no_entry_sign: Error: Please enter valid coin amount.");
						}
					} else{
						msg.channel.send(":no_entry_sign: Error: Please enter valid coin amount.");
					}
				} else{
					msg.channel.send(":no_entry_sign: Error: Please provide a user to take coins.");
				}
			} else{
				msg.channel.send(":no_entry_sign: Error: Unknown command!");
			}
		} catch(e){
			console.log(e);
		}
	}
});

//Daily coins
setInterval(() => {
	let guild = client.guilds.find("id","502609848102420510");
	guild.members.tap(member => {
		addCoins(member,10);
	});
},1000*60*60*24);

//Login
client.login(token);
