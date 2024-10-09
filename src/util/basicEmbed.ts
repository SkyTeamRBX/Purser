import { ColorResolvable, EmbedBuilder } from 'discord.js'

function emoji(status: 'ALERT' | 'WARNING' | 'GOOD' | 'BAD' | 'WAITING'): { emoji: string; color: ColorResolvable } {
	switch (status) {
		case 'ALERT':
			return {
				emoji: '<:alert:1255679013158916177>',
				color: '#250606',
			}
		case 'WARNING':
			return {
				emoji: '<:warning:1204923305895665705>',
				color: '#403200',
			}
		case 'GOOD':
			return {
				emoji: '<:good:1256020727111614586>',
				color: '#14391d',
			}
		case 'BAD':
			return {
				emoji: '<:bad:1286647140898308147>',
				color: '#250606',
			}
		case 'WAITING':
			return {
				emoji: '<a:Loading:1289587154703614045>',
				color: '#2cc1ef'
			}
	}
}

export function basicEmbed(status: 'ALERT' | 'WARNING' | 'GOOD' | 'BAD' | 'WAITING', msg: string): EmbedBuilder {
	const brand = emoji(status)

	return new EmbedBuilder().setDescription(brand.emoji + '_ _ ' + msg).setColor(brand.color)
}
