const {
  SlashCommandBuilder,
  MessageFlags,
  ActionRowBuilder,
  ContainerBuilder,
  ButtonBuilder,
  AttachmentBuilder
} = require("discord.js");

const path = require("node:path");
const quizEngine = require("../../quizEngine");
const emojis = require("../../config/emojis.json");

// Safeguard
function getActivityQuizMap(client) {
  if (!client.activeQuizzes) {
    client.activeQuizzes = new Map();
  }
  return client.activeQuizzes;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("quiz")
    .setDescription("World Quiz!"),

  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const client = interaction.client;
    const activeQuizzes = getActivityQuizMap(client);
    const userId = interaction.user.id;

    // Check active quizzes per user
    if (activeQuizzes.has(userId)) {
      await interaction.reply({
        content: `You already have an active quiz running!`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Mark as active for this user
    activeQuizzes.set(userId, {
      userId,
      channelId: interaction.channelId,
      startedAt: Date.now(),
      command: "quiz",
    });

    try {
      // Intro Container
      const typeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("type_mcq")
          .setLabel("Multiple-Choice")
          .setStyle(2),

        new ButtonBuilder()
          .setCustomId("type_text")
          .setLabel("Written")
          .setStyle(2)
      );

      const introContainer = new ContainerBuilder()
        .setAccentColor(0x131416)
        .addTextDisplayComponents((t) => t.setContent(`## Quiz Type`))
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(
            [`— **Multiple Choice Quiz**`, `— **Written Quiz**`].join("\n")
          )
        )
        .addSeparatorComponents((s) => s)
        .addActionRowComponents(typeRow);

      // Send Intro + Wait Response
      const {
        resource: { message: msg },
      } = await interaction.reply({
        components: [introContainer],
        withResponse: true,
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });

      const typeFilter = (i) => i.user.id === userId && i.customId.startsWith("type_");
      let questionTypeInteraction;
      try {
        questionTypeInteraction = await msg.awaitMessageComponent({
          filter: typeFilter,
          time: 30_000,
        });
      } catch {
        await interaction.followUp({
          content: `You took too long to respond!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Gamemode Selector
      const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
      const quizType = questionTypeInteraction.customId.replace("type_", "");
      const quizTypeDisplay = quizType === "mcq" ? "Multiple Choice Quiz" : "Written Quiz";

      const modeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("mode_country")
          .setLabel("Countries")
          .setStyle(2),

        new ButtonBuilder()
          .setCustomId("mode_capital")
          .setLabel("Capitals")
          .setStyle(2),

        new ButtonBuilder()
          .setCustomId("mode_continent")
          .setLabel("Continents")
          .setStyle(2)
      );

      const gamemodeSelector = new ContainerBuilder()
        .setAccentColor(0x131416)
        .addTextDisplayComponents((t) => t.setContent("## Gamemode Selector!"))
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(
            [
              `— **Countries** by Flag`,
              `— **Capitals** by Flag`,
              `— **Continents** by Flag`,
              `-# ${quizTypeDisplay}`,
            ].join("\n")
          )
        )
        .addSeparatorComponents((s) => s)
        .addActionRowComponents(modeRow);

      await questionTypeInteraction.update({
        components: [gamemodeSelector],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      const modeFilter = (i) => i.user.id === userId && i.customId.startsWith("mode_");
      let modeInteraction;
      try {
        modeInteraction = await msg.awaitMessageComponent({
          filter: modeFilter,
          time: 30_000,
        });
      } catch {
        await interaction.followUp({
          content: `You took too long to respond!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const gamemode = modeInteraction.customId.replace("mode_", "");
      const gamemodeDisplay = 
            gamemode === "country" ? gamemode.charAt(0).toUpperCase() + gamemode.slice(1, gamemode.length - 2) + "ies" :
            gamemode === "capital" ? gamemode.charAt(0).toUpperCase() + gamemode.slice(1) + "s" :
            gamemode === "continent" ? gamemode.charAt(0).toUpperCase() + gamemode.slice(1) + "s" : null;

      // Difficulty Container
      const diffRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("flags_easy")
          .setLabel("Easy")
          .setStyle(3),

        new ButtonBuilder()
          .setCustomId("flags_medium")
          .setLabel("Medium")
          .setStyle(3),

        new ButtonBuilder()
          .setCustomId("flags_hard")
          .setLabel("Hard")
          .setStyle(3),

        new ButtonBuilder()
          .setCustomId("flags_expert")
          .setLabel("Expert")
          .setStyle(3),

        new ButtonBuilder()
          .setCustomId("flags_worldwide")
          .setLabel("Worldwide")
          .setStyle(3)
      );

      const diffContainer = new ContainerBuilder()
        .setAccentColor(0x131416)
        .addTextDisplayComponents((t) =>
          t.setContent(
            [
              `## ${gamemodeDisplay} of the World!`,
              `Choose a difficulty to begin the quiz.`,
            ].join("\n")
          )
        )
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(
            [
              `**Easy Difficulty** — ${emojis.easy} 10 Flags`,
              `**Medium Difficulty** — ${emojis.medium} 25 Flags`,
              `**Hard Difficulty** — ${emojis.hard} 50 Flags`,
              `**Expert Difficulty** — ${emojis.expert} 100 Flags`,
              `**Mr. Worldwide Difficulty** — ${emojis.worldwide} All Flags`,
              "",
              "-# If you encounter any issues, message Angel",
            ].join("\n")
          )
        )
        .addSeparatorComponents((s) => s)
        .addActionRowComponents(diffRow);

      await modeInteraction.update({
        components: [diffContainer],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });

      // Difficulty Interaction + Quiz Type
      const diffFilter = (i) => i.user.id === userId && i.customId.startsWith("flags_");
      let diffInteraction;
      try {
        diffInteraction = await msg.awaitMessageComponent({
          filter: diffFilter,
          time: 30_000,
        });
      } catch {
        await interaction.followUp({
          content: `You took too long to respond!`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Get Difficulty + Quiz engine to prepare questions
      const difficulty = diffInteraction.customId.replace("flags_", "");
      const quizQuestions = quizEngine.getRandomCountriesByDifficulty(difficulty);
      const quizOptions = quizType === "text" ?
        `\nType your answers in this channel.\n— "skip", to skip question.\n— "end quiz", to end quiz.` : 
        `\nUse the buttons below to answer.\nYou can also Skip or End Quiz via buttons.`;
      const difficultyDisplay = difficulty === "worldwide" ?
        "Mr. " + difficulty.charAt(0).toUpperCase() + difficulty.slice(1) :
        difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

      const chosenDifficulty = new ContainerBuilder()
        .setAccentColor(0x131416)
        .addTextDisplayComponents((t) => t.setContent(`## Difficulty Selected`))
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(`Starting quiz with **${quizQuestions.length}** flags.${quizOptions}`))
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(`-# Difficulty: ${emojis[difficulty] ?? ""} **${difficultyDisplay}**`));

      await diffInteraction.update({
        components: [chosenDifficulty],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
      await sleep(2800);

      //Question Loop
      const channel = interaction.channel;

      let correctCount = 0;
      const review = [];
      let endedEarly = false;

      for (let i = 0; i < quizQuestions.length; i++) {
        const country = quizQuestions[i];
        const qNum = i + 1;
        const total = quizQuestions.length;

        if (
          !country.name ||
          !country.capital ||
          !country.fileName ||
          !country.continent
        ) {
          console.error(`Missing information on: ${country}`);
          await channel.send({
            content: `Missing information on current country. Skipping this question.`,
          });
          review.push({
            capital: country?.capital || "(Missing)",
            country: country?.name || "(Missing)",
            continent: country?.continent || "(Missing)",
            correct: false,
            userAnswer: "(Missing Information)",
          });
          continue;
        }

        const flagPath = path.join(__dirname, "..", "..", "flags", country.fileName);
        const attachment = new AttachmentBuilder(flagPath, {name: country.fileName});
        const incorrectTimer = 1800;
        const correctTimer = 1650;

        const questionText =
          gamemode === "country" ? `## Question ${qNum}/${total}\nWhat **country** is this flag?` :
          gamemode === "capital" ? `## Question ${qNum}/${total}\n What is the **capital** of this country?` :
          gamemode === "continent" ? `## Question ${qNum}/${total}\nWhat **continent** is this country in?` : null;

        const correctAnswer =
          gamemode === "country" ? country.name :
          gamemode === "capital" ? country.capital :
          gamemode === "continent" ? country.continent : null;

        // Multiple-Choice Quiz
        if (quizType === "mcq") {
          const mcqOptions = quizEngine.buildMcqOptions(country, {
            pool: quizQuestions,
            mode: gamemode,
            optionCount: 4,
          });

          const optionButtons = mcqOptions.map((opt, idx) => {
            return new ButtonBuilder()
              .setCustomId(`flags_mcq_${qNum}_${idx}_${opt.isCorrect ? "1" : "0"}`)
              .setLabel(opt.label)
              .setStyle(1);
          });
          
          const controlButtons = [
            new ButtonBuilder()
              .setCustomId(`flags_mcq_${qNum}_skip`)
              .setLabel("Skip")
              .setStyle(2),

            new ButtonBuilder()
              .setCustomId(`flags_mcq_${qNum}_end`)
              .setLabel("End Quiz")
              .setStyle(2),
          ];

          const optionsRow = new ActionRowBuilder().addComponents(...optionButtons);
          const controlRow = new ActionRowBuilder().addComponents(...controlButtons);

          const questionContainer = new ContainerBuilder()
            .setAccentColor(0x131416)
            .addTextDisplayComponents((t) => t.setContent(questionText))
            .addMediaGalleryComponents((gallery) =>
              gallery.addItems((item) =>
                item
                  .setURL(`attachment://${country.fileName}`)
                  .setDescription(`Flag of ${country.name}`)
              )
            )
            .addActionRowComponents(optionsRow)
            .addActionRowComponents(controlRow);

          // Send Question + Await Reply
          const questionMsg = await channel.send({
            components: [questionContainer],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2,
          });

          const buttonFilter = (i) =>
            i.user.id === userId &&
            i.message.id === questionMsg.id &&
            i.customId.startsWith(`flags_mcq_${qNum}`);

          let buttonInteraction;
          try {
            buttonInteraction = await questionMsg.awaitMessageComponent({
              filter: buttonFilter,
              time: 27_500,
            });
          } catch {
            // Timeout
            await questionMsg.reply({
              content: `Time's up! The answer was: **${correctAnswer}**`,
              allowedMentions: { repliedUser: false },
            });
            review.push({
              capital: country.capital,
              country: country.name,
              continent: country.continent,
              correct: false,
              userAnswer: "(no answer)",
            });
            continue;
          }

          const id = buttonInteraction.customId;

          // End Quiz
          if (id === `flags_mcq_${qNum}_end`) {
            await buttonInteraction.reply({
                content: `Ending quiz early!`,
                allowedMentions: { repliedUser: false }
            });
            endedEarly = true;
            break;
          }

          // Skip Question
          if (id === `flags_mcq_${qNum}_skip`) {
            await buttonInteraction.reply({
                content: `Skipping Question! The answer was: **${correctAnswer}**`,
                allowedMentions: { repliedUser: false }
            });

            review.push({
                capital: country.capital,
                country: country.name,
                continent: country.continent,
                correct: false,
                userAnswer: "(skipped)",
            });
            continue;
          }

          const [_, __, ___, indexStr, isCorrectFlag] = buttonInteraction.customId.split("_");
          const chosenIndex = Number(indexStr);
          const chosenOption = mcqOptions[chosenIndex];
          const isCorrect = isCorrectFlag === "1";

          if (isCorrect) correctCount++;

          await buttonInteraction.reply({
            content: isCorrect
              ? `${emojis.agree} Correct! The answer was: **${correctAnswer}**!`
              : `${emojis.disagree} Incorrect! The answer was **${correctAnswer}**!`,
            allowedMentions: { repliedUser: false },
          });

          review.push({
            capital: country.capital,
            country: country.name,
            continent: country.continent,
            correct: isCorrect,
            userAnswer: chosenOption.label,
          });

          await sleep(isCorrect ? correctTimer : incorrectTimer);
        } else {
          // Written Quiz
          const questionContainer = new ContainerBuilder()
            .setAccentColor(0x131416)
            .addTextDisplayComponents((t) => t.setContent(`${questionText}`))
            .addMediaGalleryComponents((gallery) =>
              gallery.addItems((item) =>
                item
                  .setURL(`attachment://${country.fileName}`)
                  .setDescription(`Country of ${country.name}`)
              )
            );

          const questionMsg = await channel.send({
            components: [questionContainer],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2,
          });

          // Wait for response from user + Check answer
          const msgFilter = (m) => m.author.id === userId && m.channel.id === channel.id;
          const collected = await channel.awaitMessages({
            filter: msgFilter,
            max: 1,
            time: 27_500,
          });

          // Timeout
          if (!collected.size) {
            await questionMsg.reply({
              content: `Times up! The answer was: **${correctAnswer}**`,
              allowedMentions: { repliedUser: false },
            });
            await sleep(incorrectTimer);

            review.push({
              capital: country.capital,
              country: country.name,
              continent: country.continent,
              correct: false,
              userAnswer: "(no answer)",
            });
            continue;
          }

          const userAnswer = collected.first().content;
          const normalized = quizEngine.normalizeAnswer(userAnswer);

          if (normalized === "skip") {
            await channel.send({
              content: `Skipping Answer! The answer was **${correctAnswer}**`,
              allowedMentions: { repliedUser: false },
            });
            await sleep(incorrectTimer);

            review.push({
              capital: country.capital,
              country: country.name,
              continent: country.continent,
              correct: false,
              userAnswer: "(skipped)",
            });
            continue;
          }

          if (normalized === "end quiz") {
            await channel.send({
              content: `Ending quiz early!`,
              allowedMentions: { repliedUser: false },
            });
            endedEarly = true;
            break;
          }

          const isCorrect = quizEngine.checkAnswer(country, normalized, gamemode);
          if (isCorrect) correctCount++;

          await questionMsg.reply({
            content: isCorrect
              ? `${emojis.agree} Correct! The answer was: **${correctAnswer}**`
              : `${emojis.disagree} Incorrect! The answer was: **${correctAnswer}**`,
          });
          await sleep(isCorrect ? correctTimer : incorrectTimer);

          review.push({
            capital: country.capital,
            country: country.name,
            continent: country.continent,
            correct: isCorrect,
            userAnswer: userAnswer,
          });
        }
      }

      // Summary Review
      const totalAnswered = review.length || quizQuestions.length;
      const percent = Math.round((correctCount / totalAnswered) * 100);
      const summaryTitle = endedEarly ? "Quiz Ended Early!" : "Quiz Finished!";

      const summaryContainer = new ContainerBuilder()
        .setAccentColor(0x131416)
        .addTextDisplayComponents((t) => t.setContent(`${summaryTitle}`))
        .addSeparatorComponents((s) => s)
        .addTextDisplayComponents((t) =>
          t.setContent(
            [
              `You scored **${correctCount}/${totalAnswered}** || **${percent}%**`,
              `-# Difficulty: ${emojis[difficulty]} ${difficultyDisplay}`,
            ].join("\n")
          )
        );

      await channel.send({
        components: [summaryContainer],
        flags: MessageFlags.IsComponentsV2,
      });

      // Build full review as lines
      const lines = review.map((item) => {
        const status = item.correct ? emojis.agree : emojis.disagree;
        const modeList =
          gamemode === "country" ? `**${item.country}** : you answered: \`${item.userAnswer}\`` :
          gamemode === "capital" ? `**${item.capital}**, ${item.country} : you answered: \`${item.userAnswer}\`` :
          gamemode === "continent" ? `${item.country}, **${item.continent}** – you answered \`${item.userAnswer}\`` : null;

        return `${status} ${modeList}`;
      });

      // Split into multiple chunks (bypass char limit)
      const MAX_CHUNK_LEN = 3500;
      const chunks = [];
      let current = "";

      for (const line of lines) {
        const next = (current ? "\n" : "") + line;
        if ((current + next).length > MAX_CHUNK_LEN) {
          chunks.push(current);
          current = line;
        } else current += next;
      }

      if (current) chunks.push(current);

      // Send each chunk as it's own container
      for (let i = 0; i < chunks.length; i++) {
        const title = chunks.length === 1 ? "Review" : `Review ${i + 1} / ${chunks.length}`;

        const reviewContainer = new ContainerBuilder()
          .setAccentColor(0x131416)
          .addTextDisplayComponents((t) => t.setContent(`## ${title}`))
          .addSeparatorComponents((s) => s)
          .addTextDisplayComponents((t) => t.setContent([chunks[i]].join("\n")));

        await channel.send({
          components: [reviewContainer],
          flags: MessageFlags.IsComponentsV2,
        });
      }
    } finally {
      const activeQuizzes = getActivityQuizMap(interaction.client);
      activeQuizzes.delete(interaction.user.id);
    }
  }
};
