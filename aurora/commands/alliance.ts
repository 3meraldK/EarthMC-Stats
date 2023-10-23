
import Discord from "discord.js"
import { Aurora } from "earthmc"
import { CustomEmbed } from "../../bot/objects/CustomEmbed.js"

import * as fn from '../../bot/utils/fn.js'
import * as database from "../../bot/utils/database.js"

const sendDevsOnly = (msg: Discord.Message) => msg.edit({embeds: [
    new Discord.EmbedBuilder()
    .setTitle("That command is for developers only!")
    .setTitle("Goofy ah :skull:")
    .setAuthor({name: msg.author.tag, iconURL: msg.author.displayAvatarURL()})
    .setColor(Discord.Colors.Red)
    .setTimestamp()
]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

const devArgs = ["backup", "new", "create", "delete", "disband", "add", "remove", "set", "merge", "rename"]
const allowedChannels = ["971408026516979813", "966369739679080578"]

const editorID = "966359842417705020"
const seniorEditorID = "1143253762039873646"

export default {
    name: "alliance",
    aliases: ["pacts", "submeganations", "meganations", "alliances", "a"],
    run: async (client: Discord.Client, message: Discord.Message, args: string[]) => {
        const req = args.join(" "),
              m = await message.reply({embeds: [new Discord.EmbedBuilder()
                .setTitle("<a:loading:966778243615191110> Fetching alliance data, this may take a moment.")
                .setColor(Discord.Colors.DarkBlue)]})

        const commandName = message.content.slice(1).split(' ')[0].toLowerCase()
        const cmdArray = [
            "alliances", "meganations", "submeganations", "pacts",
            "/alliances", "/meganations", "/submeganations", "/pacts"
        ]
 
        if (!req && !cmdArray.includes(commandName)) {
            return m.edit({embeds: [
                new Discord.EmbedBuilder()
                .setTitle("No Arguments Given!")
                .setDescription("Usage: `/alliance <name>`, `/alliances` or `/alliances search <key>`")
                .setTimestamp()
                .setColor(Discord.Colors.Red)
            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }

        if (commandName == "/submeganations" || commandName == "submeganations") return sendAllianceList(client, message, m, args, 'sub') 
        if (commandName == "/meganations" || commandName == "meganations") return sendAllianceList(client, message, m, args, 'mega')
        if (commandName == "/pacts" || commandName == "pacts") return sendAllianceList(client, message, m, args, 'normal') // Normal/pacts only.

        // /alliances or /alliance list
        if (commandName == "/alliances" || commandName == "alliances" || (args[0] != null && args[0].toLowerCase() == "list"))
            return sendAllianceList(client, message, m, args, 'all') // Includes all types.
        
        // /alliance <allianceName>
        if (args.length == 1 && args[0].toLowerCase() != "list") return sendSingleAlliance(client, message, m, args)
        else if (args.length > 1) {
            // There is an argument, but not a dev one.
            if (args[0] && !devArgs.includes(args[0].toLowerCase())) {
                if (args[0].toLowerCase() == "online") {
                    const foundAlliance = await database.Aurora.getAlliance(args[1])

                    if (!foundAlliance) return m.edit({embeds: [
                        new Discord.EmbedBuilder()
                            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                            .setTitle("Error fetching alliance")
                            .setDescription("That alliance does not exist! Please try again.")
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const ops = await Aurora.Players.online(true).catch(() => null)
                    if (!ops) return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.Red)
                        .setTitle(`Error fetching online players`)
                        .setDescription("")
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const allianceOps = ops?.filter(op => foundAlliance.online.find(p => p == op.name)) ?? []
                    if (allianceOps.length < 1) return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.DarkBlue)
                        .setTitle(`Online in ${name(foundAlliance)} [0]`)
                        .setDescription("No players are online in this alliance :(")
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const botembed = []
                    const allData = allianceOps
                        .map(res => res.name + " - " + res.town + " | " + res.rank)
                        .join('\n').match(/(?:^.*$\n?){1,10}/mg)
                
                    const len = allData.length
                    for (let i = 0; i < len; i++) {
                        botembed[i] = new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.DarkBlue)
                        .setTitle("Online in " + name(foundAlliance))
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setDescription("```" + allData[i] + "```")
                        .setFooter({text: `Page ${i + 1}/${allData.length}`, iconURL: client.user.avatarURL()})
                        .setTimestamp()
                    }

                    return await m.edit({embeds: [botembed[0]]}).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
                }
            }
            else {
                //#region Alliance editing
                if (!allowedChannels.includes(message.channel.id)) {
                    return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle("Error running command")
                        .setDescription("Alliance commands are not allowed in this channel!")
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                }

                // Correct channel, but not an editor or dev.
                const isEditor = message.member.roles.cache.has(editorID)
                if (!fn.botDevs.includes(message.author.id) && !isEditor) return sendDevsOnly(m)

                const seniorEditor = message.member.roles.cache.has(seniorEditorID)

                const arg1 = args[0]?.toLowerCase()
                const arg2 = args[1]?.toLowerCase()

                // Creating an alliance
                if (arg1 == "create" || arg1 == "new") {   
                    const allianceName = args[1]
                    const leaderName = !args[2] ? "No leader set." : argsHelper(args, 2).asString()
                    
                    if (!isNaN(Number(allianceName))) {
                        return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error creating alliance")
                            .setDescription("Alliance names cannot be numbers! Please try again.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                    }
                    
                    database.Aurora.getAlliances().then(async alliances => {
                        const foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                        if (foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error creating alliance")
                            .setDescription("The alliance you're trying to create already exists! Please use /alliance add.")
                            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        else {
                            const alliance = {
                                allianceName: allianceName,
                                leaderName: leaderName,
                                discordInvite: "No discord invite has been set for this alliance",
                                nations: [],
                                type: 'Normal'
                            }
                            
                            alliances.push(alliance)
                            database.Aurora.setAlliances(alliances)
                        
                            const embed = new Discord.EmbedBuilder()
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                                .setAuthor({ 
                                    name: message.author.username, 
                                    iconURL: message.author.displayAvatarURL() 
                                })

                            if (leaderName == "No leader set.") return m.edit({embeds: [embed
                                .setTitle("Alliance Created")
                                .setDescription("The alliance `" + allianceName + "` has been created.\n\nNo leader has been set.")
                            ]})

                            return m.edit({embeds: [embed
                                .setTitle("Alliance Created")
                                .setDescription("The alliance `" + allianceName + "` has been created.\n\nLeader(s): `" + leaderName + "`")
                            ]})
                        }
                    })
                } else if (arg1 == "rename") {
                    database.Aurora.getAlliances().then(async alliances => {
                        const allianceName = arg2,
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName)
                            
                        if (!foundAlliance) {
                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error renaming alliance")
                                .setDescription("The alliance you're trying to rename does not exist! Please try again.")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        } else {               
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName)
                            
                            m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Alliance Renamed")
                                .setDescription("The alliance ```" + foundAlliance.allianceName + "``` has been renamed to ```" + args[2] + "```")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})

                            foundAlliance.allianceName = args[2]
                            alliances[allianceIndex] = foundAlliance
                            
                            database.Aurora.setAlliances(alliances)
                        }
                    })
                } else if (arg1 == "delete" || arg1 == "disband") {
                    if (isEditor && !seniorEditor) return sendDevsOnly(m)

                    database.Aurora.getAlliances().then(async alliances => {
                        const allianceName = arg2,
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName)

                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error disbanding alliance")
                            .setDescription("The alliance you're trying to disband does not exist! Please try again.")
                            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        else {
                            const allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName)

                            alliances.splice(allianceIndex, 1)
                            database.Aurora.setAlliances(alliances)
                        
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Disbanded")
                                .setDescription("The alliance `" + name(foundAlliance) + "` has been disbanded.")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                }
                else if (arg1 == "add") { // Adding nation(s) to an alliance      
                    database.Aurora.getAlliances().then(async alliances => {
                        const allianceName = arg2,
                              foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) return m.edit({embeds: [
                            new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        else {
                            // Remove first 2 args, then remove commas from every other argument.
                            const formattedArgs = argsHelper(args, 2),
                                  nationsToAdd = formattedArgs.asArray(),
                                  allianceIndex = alliances.findIndex(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())

                            //console.log(nationsToAdd)
                            if (!nationsToAdd) return

                            database.Aurora.getNations().then(async nations => {
                                const nationsSkipped = [], 
                                    nationsAdded = []
                                    
                                const len = nationsToAdd.length
                                for (let i = 0; i < len; i++) {                                                 
                                    const nation = nations.find(n => n.name.toLowerCase() == nationsToAdd[i].toLowerCase())
            
                                    if (!nation) {
                                        nationsSkipped.push(nationsToAdd[i])
                                        continue
                                    }

                                    nationsAdded.push(nation.name)

                                    // If the current nation doesn't already exist in the alliance, add it.
                                    const foundNation = foundAlliance.nations.find(nation => nation.toLowerCase() == nationsToAdd[i].toLowerCase())
                                    if (!foundNation) foundAlliance.nations.push(nation.name)
                                }

                                alliances[allianceIndex] = foundAlliance
                                database.Aurora.setAlliances(alliances)

                                const allianceEmbed = new Discord.EmbedBuilder()
                                    .setTitle("Alliance Updated | " + name(foundAlliance))
                                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                    .setTimestamp()
                                
                                // Some nations skipped, some added.
                                if (nationsSkipped.length >= 1 && nationsAdded.length >= 1) {
                                    allianceEmbed.setColor(Discord.Colors.Orange)
                                                 .setDescription("The following nations have been added:\n\n```" + nationsAdded.join(", ") + 
                                                                 "```\n\nThe following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```")
                                }
                                else if (nationsSkipped.length >= 1 && nationsAdded.length < 1) { // No nations added, all skipped.          
                                    allianceEmbed.setColor(Discord.Colors.Red)       
                                                 .setDescription("The following nations do not exist:\n\n```" + nationsSkipped.join(", ") + "```")
                                }
                                else if (nationsSkipped.length < 1 && nationsAdded.length >= 1) { // Nations added, none skipped.
                                    allianceEmbed.setColor(Discord.Colors.DarkBlue)
                                                 .setDescription("The following nations have been added:\n\n```" + nationsAdded.join(", ") + "```")
                                }
                                
                                return m.edit({embeds: [allianceEmbed]})
                            })
                        }
                    })
                } else if (arg1 == "remove") {
                    database.Aurora.getAlliances().then(async alliances => {
                        const allianceName = arg2,
                              foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) {
                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                        } else {
                            const formattedArgs = argsHelper(args, 2),
                                  nationsToRemove = formattedArgs.asArray(),
                                  allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                            
                            if (!nationsToRemove) return

                            const len = nationsToRemove.length
                            for (let i = 0; i < len; i++) {
                                const currentNationToRemove = nationsToRemove[i]
                                
                                // If a nation is a number, return an error message.
                                if (!isNaN(Number(currentNationToRemove))) return m.edit({embeds: [
                                    new Discord.EmbedBuilder()
                                        .setTitle("Error updating alliance")
                                        .setDescription("Cannot use a number as an alliance nation! Please try again.")
                                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                        .setColor(Discord.Colors.Red)
                                        .setTimestamp()
                                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                                         
                                const foundAllianceNations = foundAlliance.nations,
                                      nationToRemoveLower = currentNationToRemove.toLowerCase()

                                const foundNation = foundAllianceNations.find(nation => nation.toLowerCase() == nationToRemoveLower),
                                      foundNationIndex = foundAllianceNations.findIndex(nation => nation.toLowerCase() == nationToRemoveLower)
                                                    
                                // If the current nation exists in the alliance, remove it.
                                if (foundNation) foundAllianceNations.splice(foundNationIndex, 1)
                                else nationsToRemove.splice(foundNationIndex, 1)
                            }
                        
                            if (nationsToRemove.length < 1) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("None of the specified nations exist in that alliance!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                            alliances[allianceIndex] = foundAlliance
                            database.Aurora.setAlliances(alliances)

                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The following nation(s) have been removed:\n\n```" + formattedArgs.asString() + "```")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                } else if (arg1 == "set") {
                    if (!arg2) {
                        return m.edit({embeds: [
                            new Discord.EmbedBuilder()
                            .setTitle(`Please provide a valid option for this command.\nChoices: Leader, Discord, Type or Image/Flag.`)
                            .setTimestamp()
                            .setColor(Discord.Colors.Red)
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                    } else if (arg2 == "leader") {
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("Unable to update that alliance as it does not exist!")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.leaderName = argsHelper(args, 3).asString()
                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Aurora.setAlliances(alliances)
                            
                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance leader has been set to: `" + foundAlliance.leaderName + "`")
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        })
                    }
                    else if (arg2 == "discord" || arg2 == "invite") {
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()
                            ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            const inviteInput = args[3]
                            if (!inviteInput.startsWith("https://discord.gg")) {
                                return m.edit({embeds: [new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("That invite is not valid. Make sure it begins with `https://discord.gg`.")
                                    .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()
                                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            }

                            foundAlliance.discordInvite = inviteInput

                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                            alliances[allianceIndex] = foundAlliance

                            await database.Aurora.setAlliances(alliances)

                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance discord link has been set to: " + inviteInput)
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        })
                    }
                    else if (arg2== "image" || arg2 == "flag") {
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("Unable to update that alliance as it does not exist!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.imageURL = args[3]
                                
                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
                            alliances[allianceIndex] = foundAlliance   

                            await database.Aurora.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The alliance image has been set to:") 
                                .setImage(args[3])
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]}).catch(() => {})
                        })
                    }
                    else if (arg2 == "type") { 
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            if (!foundAlliance) return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("Unable to update that alliance as it does not exist!")
                                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            const type = args[3].toLowerCase()
                            if (type != 'sub' && type != 'normal' && type != 'mega') 
                                return m.edit({embeds: [
                                    new Discord.EmbedBuilder()
                                        .setTitle("Invalid Arguments!")
                                        .setDescription("Unable to set alliance type. Choose one of the following: `sub`, `mega`, `normal`")
                                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                        .setColor(Discord.Colors.Red)
                                        .setTimestamp()]
                                }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

                            foundAlliance["type"] = type
                            const desc = type == 'sub' ? "The alliance is now a sub-meganation. :partying_face: " 
                                       : type == 'mega' ? "The alliance is now a meganation! :statue_of_liberty:" 
                                       : "The alliance type has been set back to normal. :pensive:"

                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance   
                            await database.Aurora.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                    .setTitle("Alliance Updated | " + name(foundAlliance))
                                    .setDescription(desc)
                                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                    .setColor(Discord.Colors.DarkBlue)
                                    .setTimestamp()]
                            }).catch(() => {})
                        })
                    } else if (arg2 == "colours" || arg2 == "colors") {
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
    
                            if (!foundAlliance) return m.edit({embeds: [
                                    new Discord.EmbedBuilder()
                                    .setTitle("Error updating alliance")
                                    .setDescription("That alliance does not exist!")
                                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                    .setColor(Discord.Colors.Red)
                                    .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.colours = { 
                                fill: args[3],
                                outline: args[4] ?? args[3]
                            }
                                
                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
    
                            alliances[allianceIndex] = foundAlliance
                            database.Aurora.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription(`The alliance colours have been set to: \n
                                    Fill: ${foundAlliance.colours.fill}\n
                                    Outline: ${foundAlliance.colours.outline}`)
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]}).catch(() => {})
                        })
                    } else if (arg2 == "fullname" || arg2 == "label") {
                        database.Aurora.getAlliances().then(async alliances => {
                            const allianceName = args[2],
                                  foundAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
    
                            if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Error updating alliance")
                                .setDescription("That alliance does not exist!")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.Red)
                                .setTimestamp()]
                            }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
                            
                            foundAlliance.fullName = args.splice(3).join(" ")
                                
                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())
    
                            alliances[allianceIndex] = foundAlliance
                            database.Aurora.setAlliances(alliances)
                            
                            return m.edit({embeds: [new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + foundAlliance.allianceName)
                                .setDescription(`The alliance's full name has been set to: ${foundAlliance.fullName}`) 
                                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]}).catch(() => {})
                        })
                    } else return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle(`${args[1]} isn't a valid option, please try again.`)
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                }
                else if (arg1 == "merge") {
                    database.Aurora.getAlliances().then(async alliances => {
                        const allianceName = arg2,
                              foundAlliance = alliances.find(alliance => alliance.allianceName.toLowerCase() == allianceName.toLowerCase())
                        
                        if (!foundAlliance) return m.edit({embeds: [new Discord.EmbedBuilder()
                            .setTitle("Error updating alliance")
                            .setDescription("Unable to update that alliance as it does not exist!")
                            .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                            .setColor(Discord.Colors.Red)
                            .setTimestamp()
                        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                        else {
                            const alliancesToMerge = args.slice(2)
                            const alliancesLen = alliancesToMerge.length
                            
                            for (let i = 0; i < alliancesLen; i++) {
                                const allianceToMerge = alliancesToMerge[i]
                                
                                // If an alliance is a number, return an error message.
                                if (!isNaN(Number(allianceToMerge))) {
                                    return m.edit({embeds: [
                                        new Discord.EmbedBuilder()
                                        .setTitle("Error updating alliance")
                                        .setDescription("Cannot use a number as an alliance name! Please try again.")
                                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                        .setColor(Discord.Colors.Red)
                                        .setTimestamp()
                                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                                }
                            
                                const foundMergeAlliance = alliances.find(a => a.allianceName.toLowerCase() == allianceToMerge.toLowerCase())
                                if (foundMergeAlliance) foundAlliance.nations = foundAlliance.nations.concat(foundMergeAlliance.nations)
                            }

                            const allianceIndex = alliances.findIndex(a => a.allianceName.toLowerCase() == allianceName.toLowerCase())

                            alliances[allianceIndex] = foundAlliance
                            database.Aurora.setAlliances(alliances)
                        
                            return m.edit({embeds: [
                                new Discord.EmbedBuilder()
                                .setTitle("Alliance Updated | " + name(foundAlliance))
                                .setDescription("The following alliances have been merged:\n\n```" + alliancesToMerge.join(", ").toString() + "```")
                                .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                                .setColor(Discord.Colors.DarkBlue)
                                .setTimestamp()
                            ]})
                        }
                    })
                }
                else if (arg1 == "backup") {
                    if (isEditor) return sendDevsOnly(m)
                    
                    const backupData = await fn.jsonReq(arg2).catch(e => console.error(e)) as any
                    if (!backupData) return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle(`\`${arg2}\` isn't a valid JSON file, please try again.`)
                        .setTimestamp()
                        .setColor(Discord.Colors.Red)
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

                    const alliances = await database.Aurora.getAlliances(),
                          len = backupData.length,
                          restored = []

                    for (let i = 0; i < len; i++) { 
                        const alliance = backupData[i]
                        const exists = alliances.some(a => a.allianceName == alliance.allianceName)
                        
                        if (exists) {
                            alliances.push(alliance)
                            restored.push(alliance.allianceName)
                        }
                    }

                    await database.Aurora.setAlliances(alliances)
                            
                    return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setTitle("Backup Successful")
                        .setDescription('The following alliances have been restored:\n\n```' + restored.join(", ") + '```') 
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setColor(Discord.Colors.DarkBlue)
                        .setTimestamp()
                    ]}).catch(() => {})
                }
                else return m.edit({embeds: [new Discord.EmbedBuilder()
                    .setTitle("Invalid Usage!")
                    .setDescription("Invalid dev argument: `" + args[0] + "`")
                    .setTimestamp()
                    .setColor(Discord.Colors.Red)
                ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                //#endregion
            }
        }
    }
}

async function sendAllianceList(client, message, m, args, type) {
    database.Aurora.getAlliances().then(async allianceArr => { 
        return type.toLowerCase() == 'all' 
            ? allianceArr : allianceArr.filter(a => !!a.type && (a.type.toLowerCase() == type.toLowerCase()))
    }).then(async alliances => {
        database.Aurora.getNations().then(async nations => {
            const alliancesLen = alliances.length

            for (let i = 0; i < alliancesLen; i++) {
                const alliance = alliances[i]

                const accumulator = alliance.nations.reduce((acc, allianceNation) => {
                    const foundNation = nations.find(nation => nation.name === allianceNation)
                    if (foundNation) {
                        acc.residents += foundNation.residents.length
                        acc.towns += foundNation.towns.length
                        acc.area += foundNation.area
                    }

                    return acc
                }, { residents: 0, area: 0, towns: 0 })

                alliance["residents"] = accumulator.residents
                alliance["area"] = accumulator.area
                alliance["towns"] = accumulator.towns
            }

            let foundAlliances = [],
                searching = false
            
            //#region Sort
            const arg2 = args[1]?.toLowerCase()
            const arg3 = args[2]?.toLowerCase()

            // /alliances <option>
            if (!arg2) defaultSort(alliances)
            else if (arg2 == "towns") {
                alliances.sort((a, b) => {
                    if (b.towns.length > a.towns.length) return 1
                    if (b.towns.length < a.towns.length) return -1
                })
            } else if (arg2 == "nations") {
                alliances.sort((a, b) => {
                    if (b.nations.length > a.nations.length) return 1
                    if (b.nations.length < a.nations.length) return -1
                })
            } else if (arg2 == "residents") {
                alliances.sort((a, b) => {
                    if (b.residents > a.residents) return 1
                    if (b.residents < a.residents) return -1
                })
            } else if (arg2 == "area" || (arg3 && arg3 == "chunks")) {
                alliances.sort((a, b) => {
                    if (b.area > a.area) return 1
                    if (b.area < a.area) return -1
                })
            } else { // /alliances <option> <option> ... ...
                defaultSort(alliances)

                const arg1 = args[0]?.toLowerCase()
                const filterAlliances = (arr: any[], key: string) => 
                    arr.filter(a => a.allianceName.toLowerCase().includes(key))

                if (arg1 && arg1 == "search") {
                    foundAlliances = filterAlliances(alliances, arg2)
                    searching = true
                } else if (arg2 == "search") { // /alliance list search
                    foundAlliances = filterAlliances(alliances, arg3)
                    searching = true
                }
            }
            //#endregion

            //#region Search or send all
            if (searching) {
                if (foundAlliances.length == 0) {
                    return m.edit({embeds: [new Discord.EmbedBuilder()
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setTitle("Searching unsuccessful")
                        .setDescription("Could not find any alliances matching that key.")
                        .setColor(Discord.Colors.Red)
                        .setTimestamp()
                    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
                } else {
                    const botembed = []

                    const type = (a) => a.type == 'mega' ? 'Meganation' : a.type == 'sub' ? 'Sub-Meganation' : 'Normal'
                    const allData = foundAlliances.map(alliance => 
                        "**" + name(alliance) + "**" + " (" + type(alliance) + ")" +
                        "```Leader(s): " + alliance.leaderName + 
                        "``````Nation(s): " + alliance.nations.length +
                        "``````Towns: " + alliance.towns +
                        "``````Residents: " + alliance.residents + 
                        "``````Area: " + alliance.area + 
                        "``````Discord Link: " + alliance.discordInvite + "```").join('\n').match(/(?:^.*$\n?){1,3}/mg)

                    const len = allData.length
                    for (let i = 0; i < len; i++) {
                        botembed[i] = new Discord.EmbedBuilder()
                        .setColor(Discord.Colors.DarkBlue)
                        .setTitle("List of Alliances")
                        .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                        .setDescription(allData[i])
                        .setTimestamp()
                        .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                    }

                    return await m.edit({embeds: [botembed[0]]}).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
                }
            } else {
                const botembed = []

                const type = (a) => a.type == 'mega' ? 'Meganation' : a.type == 'sub' ? 'Sub-Meganation' : 'Normal'
                const allData = alliances.map((alliance, index) => 
                    (index + 1) + ". **" + name(alliance) + "**" + " (" + type(alliance) + ")" +
                    "```Leader(s): " + alliance.leaderName + 
                    "``````Nation(s): " + alliance.nations.length +
                    "``````Towns: " + alliance.towns +
                    "``````Residents: " + alliance.residents + 
                    "``````Area: " + alliance.area + 
                    "``````Discord Link: " + alliance.discordInvite + "```").join('\n').match(/(?:^.*$\n?){1,3}/mg)

                const len = allData.length
                for (let i = 0; i < len; i++) {
                    botembed[i] = new Discord.EmbedBuilder()
                    .setColor(Discord.Colors.DarkBlue)
                    .setTitle("List of Alliances")
                    .setAuthor({name: message.author.username, iconURL: message.author.displayAvatarURL()})
                    .setDescription(allData[i])
                    .setTimestamp()
                    .setFooter({text: `Page ${i+1}/${len}`, iconURL: client.user.avatarURL()})
                }

                return await m.edit({embeds: [botembed[0]]}).then(msg => fn.paginator(message.author.id, msg, botembed, 0))
            }
            //#endregion
        })
    })
}

async function sendSingleAlliance(
    client: Discord.Client, 
    message: Discord.Message, 
    m: Discord.Message, 
    args: string[]
) {
    const foundAlliance = await database.Aurora.getAlliance(args[0])
    if (!foundAlliance) {
        return m.edit({embeds: [
            new Discord.EmbedBuilder()
            .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
            .setTitle("Error fetching alliance")
            .setDescription("That alliance does not exist! Please try again.")
            .setColor(Discord.Colors.Red)
            .setTimestamp()
        ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 
    }

    const leaderNames = foundAlliance.leaderName.split(', ')
    const players = await database.getPlayers().then(arr => arr.filter(p => 
        leaderNames.find(l => l.toLowerCase() == p.name.toLowerCase())
    ))

    if (!players) return m.edit({embeds: [
        new Discord.EmbedBuilder()
        .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
        .setTitle("Database error occurred")
        .setDescription("Failed to fetch players needed for this command to work.")
        .setColor(Discord.Colors.Red)
        .setTimestamp()
    ]}).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {}) 

    const typeString = !foundAlliance.type ? "Normal" : foundAlliance.type.toLowerCase(),
          allianceType = typeString == 'sub' ? "Sub-Meganation" : 
                         typeString == 'mega' ? "Meganation" : "Normal"
    
    const playersLen = players.length,
          leaders = []

    for (let i = 0; i < playersLen; i++) {
        const leader = players[i]
        const leaderID = leader.linkedID

        if (leaderID) {
            const members = (message.channel as Discord.TextChannel).members
            if (members.get(leaderID)) {
                // Leader can view channel where command was issued, use mention.
                leaders.push(`<@${leaderID}>`)
                continue
            }
        }

        leaders.push(leader.name.replace(/_/g, "\\_"))
    }
    
    const rank = foundAlliance.rank > 0 ? ` | #${foundAlliance.rank}` : ``
    const leadersStr = leaders.length > 0 ? leaders.join(", ") : "None"

    const allianceEmbed = new CustomEmbed(client, `(Aurora) Alliance Info | ${name(foundAlliance)}${rank}`)
        .setThumbnail(foundAlliance.imageURL ? foundAlliance.imageURL : 'attachment://aurora.png')
        .setColor(foundAlliance.colours 
            ? parseInt(foundAlliance.colours?.fill.replace('#', '0x')) 
            : Discord.Colors.DarkBlue
        )
        .setDefaultAuthor(message)
        .setTimestamp()
        .addFields(
            fn.embedField("Leader(s)", leadersStr, true),
            fn.embedField("Towns", foundAlliance.towns.toString(), true),
            fn.embedField("Residents", foundAlliance.residents.toString(), true),
            fn.embedField("Type", allianceType, true),
            fn.embedField("Size", foundAlliance.area + " Chunks", true),
            fn.embedField("Online", foundAlliance.online.length.toString(), true)
        )

    if (foundAlliance.discordInvite != "No discord invite has been set for this alliance") 
        allianceEmbed.setURL(foundAlliance.discordInvite)
    
    const thumbnail = foundAlliance.imageURL ? [] : [fn.AURORA.thumbnail],
          nationsString = foundAlliance.nations.join(", ")

    const allianceNationsLen = foundAlliance.nations.length
    if (nationsString.length < 1024) {
        if (allianceNationsLen <= 0) {
            allianceEmbed.addFields(fn.embedField("Nations [0]", "There are no nations in this alliance."))
        }
        else allianceEmbed.addFields(fn.embedField(
            `Nations [${allianceNationsLen}]`, 
            "```" + nationsString + "```"
        ))
    }
    else {
        allianceEmbed.addFields(fn.embedField(
            `Nations [${allianceNationsLen}]`, 
            "Too many nations to display! Click the 'view all' button to see the full list."
        ))

        allianceEmbed.addButton('view_all_nations', 'View All Nations', Discord.ButtonStyle.Primary)
    }

    return m.edit({ embeds: [allianceEmbed], files: thumbnail, components: allianceEmbed.components })
}

const defaultSort = (arr: any[]) => {
    arr.sort((a, b) => {
        if (b.residents > a.residents) return 1
        if (b.residents < a.residents) return -1
        
        if (b.area > a.area) return 1
        if (b.area < a.area) return -1

        if (b.nations.length > a.nations.length) return 1
        if (b.nations.length < a.nations.length) return -1

        if (b.towns.length > a.towns.length) return 1
        if (b.towns.length < a.towns.length) return -1
    })

    return arr
}

const name = alliance => alliance.fullName ?? alliance.allianceName
function argsHelper(args: string[], spliceAmt: number) {
    return {
        original: args,
        spliced: [],
        format: function() { 
        this.spliced = this.original.splice(spliceAmt).map(e => e.replace(/,/g, ''))
            return this.spliced
        },
        asArray: function() { return this.spliced?.length < 1 ? this.format() : this.spliced },
        asString: function(delimiter = ", ") { return this.asArray().join(delimiter) }
    }
}