import * as fn from'../../bot/utils/fn.js'
import * as emc from 'earthmc'

import { Colors, EmbedBuilder } from "discord.js"
import type { Client, Message } from "discord.js"

export default {
    name: "townless",
    description: "Lists all online players without a town.",
    run: async (client: Client, message: Message, args: string[]) => {
        const req = args.join(" ")
        const m = await message.reply({embeds: [new EmbedBuilder()
            .setColor(Colors.DarkPurple)
            .setTitle("<a:loading:966778243615191110> Fetching townless players, this may take a moment.")]
        })
                
        const townlessPlayers = await emc.Nova.Players.townless().catch(() => {}) 
        if (!townlessPlayers) return await m.edit({ embeds: [fn.fetchError] })
            .then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})

        let i = 0, page = 1   

        if (req.split(" ")[0]) page = parseInt(req.split(" ")[0])
        if (isNaN(page)) page = 0
        else page--

        const allData = townlessPlayers.map(p => p.name).join('\n').match(/(?:^.*$\n?){1,10}/mg)
        const botembed = []
        
        if (townlessPlayers.length < 1) {
            const noTownlessEmbed = new EmbedBuilder()
                .setColor(Colors.DarkPurple)
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setTitle("(Nova) Townless Players [0]")
                .setDescription("There are currently no townless players!")
                .setTimestamp()
    
            return m.edit({ embeds: [noTownlessEmbed] }).then(m => setTimeout(() => m.delete(), 10000)).catch(() => {})
        }
        else if (allData.length <= 1) { // If only one page, don't create paginator.
            return m.edit({embeds: [new EmbedBuilder()
                .setColor(Colors.DarkPurple)
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setTitle(`(Nova) Townless Players [${townlessPlayers.length}]`)
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData.toString() + "```")
                .setTimestamp()
            ]})
        }
        else { // More than one page, create paginator.
            for (i = 0; i < allData.length; i++) {
                botembed[i] = new EmbedBuilder()
                .setColor(Colors.DarkPurple)
                .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
                .setTitle(`(Nova) Townless Players [${townlessPlayers.length}]`)
                .setDescription("```" + townlessPlayers[0].name + "\n" + allData[i] + "```")
                .setTimestamp()
                .setFooter({text: `Page ${i+1}/${allData.length}`, iconURL: client.user.avatarURL()})
            }

            await m.edit({embeds: [botembed[page]]}).then(msg => fn.paginator(message.author.id, msg, botembed, page)).catch(err => console.log(err))
        }
    }
}