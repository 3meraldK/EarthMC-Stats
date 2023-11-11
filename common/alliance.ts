/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-unused-vars */
import { BaseHelper } from "./base.js"

import type { Client } from "discord.js"
import { Colors } from "discord.js"

import { getAlliances } from "../bot/utils/aurora.js"
import { type Alliance } from "../bot/types.js"

class AllianceHelper extends BaseHelper {
    data: any

    dbAlliances: Alliance[]

    constructor(client: Client, isNova = false) {
        super(client, isNova)
        this.embed.setColor(Colors.DarkBlue)
    }

    addField(name: string, value: string, inline = false) {
        this.embed.addFields({ name, value, inline })
        return this.embed
    }

    async init(input: string) {
        this.dbAlliances = await getAlliances()
    }
    
    async lookup(name: string) {

    }
}

export {
    AllianceHelper
}