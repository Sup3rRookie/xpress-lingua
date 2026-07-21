import { Deck } from './types';

// Mandarin Survival Deck v1 — 5 scenarios x 12 items, chunk-heavy per spec.
// Pinyin is tone-marked; tone colors are derived at render time.
export const zhSurvival: Deck = {
  lang: 'zh',
  langLabel: 'Mandarin',
  ttsLocale: 'zh-CN',
  scenarios: [
    { id: 'greetings', title: 'Greetings & Basics', emoji: '👋' },
    { id: 'numbers', title: 'Numbers & Money', emoji: '💰' },
    { id: 'food', title: 'Food & Drink', emoji: '🍜' },
    { id: 'taxi', title: 'Taxi & Directions', emoji: '🚕' },
    { id: 'repair', title: 'Small Talk & Rescue Phrases', emoji: '💬' },
  ],
  items: [
    // ---- Greetings & Basics ----
    { id: 'zh-g01', scenario: 'greetings', type: 'chunk', hanzi: '你好', pinyin: 'nǐ hǎo', gloss: 'hello', emoji: '👋' },
    { id: 'zh-g02', scenario: 'greetings', type: 'chunk', hanzi: '早上好', pinyin: 'zǎo shang hǎo', gloss: 'good morning', emoji: '🌅' },
    { id: 'zh-g03', scenario: 'greetings', type: 'word', hanzi: '谢谢', pinyin: 'xiè xie', gloss: 'thank you', emoji: '🙏' },
    { id: 'zh-g04', scenario: 'greetings', type: 'chunk', hanzi: '不客气', pinyin: 'bú kè qi', gloss: "you're welcome", emoji: '😊' },
    { id: 'zh-g05', scenario: 'greetings', type: 'word', hanzi: '对不起', pinyin: 'duì bu qǐ', gloss: 'sorry', emoji: '😔' },
    { id: 'zh-g06', scenario: 'greetings', type: 'chunk', hanzi: '没关系', pinyin: 'méi guān xi', gloss: "it's okay / no problem", emoji: '🤝' },
    { id: 'zh-g07', scenario: 'greetings', type: 'word', hanzi: '再见', pinyin: 'zài jiàn', gloss: 'goodbye', emoji: '👋' },
    { id: 'zh-g08', scenario: 'greetings', type: 'chunk', hanzi: '请问', pinyin: 'qǐng wèn', gloss: 'excuse me, may I ask…', emoji: '🙋' },
    { id: 'zh-g09', scenario: 'greetings', type: 'sentence', hanzi: '我叫丹尼尔', pinyin: 'wǒ jiào dān ní ěr', gloss: 'my name is Daniel (swap your name)', emoji: '🪪' },
    { id: 'zh-g10', scenario: 'greetings', type: 'sentence', hanzi: '你叫什么名字', pinyin: 'nǐ jiào shén me míng zi', gloss: "what's your name?", emoji: '❓' },
    { id: 'zh-g11', scenario: 'greetings', type: 'chunk', hanzi: '很高兴认识你', pinyin: 'hěn gāo xìng rèn shi nǐ', gloss: 'nice to meet you', emoji: '🤗' },
    { id: 'zh-g12', scenario: 'greetings', type: 'chunk', hanzi: '好的', pinyin: 'hǎo de', gloss: 'okay / sure', emoji: '👌' },

    // ---- Numbers & Money ----
    { id: 'zh-n01', scenario: 'numbers', type: 'word', hanzi: '一 二 三', pinyin: 'yī èr sān', gloss: 'one, two, three', emoji: '1️⃣' },
    { id: 'zh-n02', scenario: 'numbers', type: 'word', hanzi: '四 五 六', pinyin: 'sì wǔ liù', gloss: 'four, five, six', emoji: '🎲' },
    { id: 'zh-n03', scenario: 'numbers', type: 'word', hanzi: '七 八 九 十', pinyin: 'qī bā jiǔ shí', gloss: 'seven, eight, nine, ten', emoji: '🔟' },
    { id: 'zh-n04', scenario: 'numbers', type: 'word', hanzi: '一百', pinyin: 'yì bǎi', gloss: 'one hundred', emoji: '💯' },
    { id: 'zh-n05', scenario: 'numbers', type: 'word', hanzi: '钱', pinyin: 'qián', gloss: 'money', emoji: '💵' },
    { id: 'zh-n06', scenario: 'numbers', type: 'chunk', hanzi: '多少钱', pinyin: 'duō shao qián', gloss: 'how much is it?', emoji: '🏷️' },
    { id: 'zh-n07', scenario: 'numbers', type: 'chunk', hanzi: '太贵了', pinyin: 'tài guì le', gloss: 'too expensive!', emoji: '😱' },
    { id: 'zh-n08', scenario: 'numbers', type: 'chunk', hanzi: '便宜一点', pinyin: 'pián yi yì diǎn', gloss: 'a bit cheaper, please', emoji: '📉' },
    { id: 'zh-n09', scenario: 'numbers', type: 'sentence', hanzi: '一共多少钱', pinyin: 'yí gòng duō shao qián', gloss: 'how much in total?', emoji: '🧾' },
    { id: 'zh-n10', scenario: 'numbers', type: 'word', hanzi: '这个', pinyin: 'zhè ge', gloss: 'this one', emoji: '👇' },
    { id: 'zh-n11', scenario: 'numbers', type: 'word', hanzi: '那个', pinyin: 'nà ge', gloss: 'that one', emoji: '👉' },
    { id: 'zh-n12', scenario: 'numbers', type: 'chunk', hanzi: '我要这个', pinyin: 'wǒ yào zhè ge', gloss: 'I want this one', emoji: '🛍️' },

    // ---- Food & Drink ----
    { id: 'zh-f01', scenario: 'food', type: 'word', hanzi: '咖啡', pinyin: 'kā fēi', gloss: 'coffee', emoji: '☕' },
    { id: 'zh-f02', scenario: 'food', type: 'word', hanzi: '茶', pinyin: 'chá', gloss: 'tea', emoji: '🍵' },
    { id: 'zh-f03', scenario: 'food', type: 'word', hanzi: '水', pinyin: 'shuǐ', gloss: 'water', emoji: '💧' },
    { id: 'zh-f04', scenario: 'food', type: 'word', hanzi: '米饭', pinyin: 'mǐ fàn', gloss: 'rice', emoji: '🍚' },
    { id: 'zh-f05', scenario: 'food', type: 'word', hanzi: '面条', pinyin: 'miàn tiáo', gloss: 'noodles', emoji: '🍜' },
    { id: 'zh-f06', scenario: 'food', type: 'sentence', hanzi: '我要一杯咖啡', pinyin: 'wǒ yào yì bēi kā fēi', gloss: 'I want a cup of coffee', emoji: '☕' },
    { id: 'zh-f07', scenario: 'food', type: 'chunk', hanzi: '服务员', pinyin: 'fú wù yuán', gloss: 'waiter! (calling)', emoji: '🙋' },
    { id: 'zh-f08', scenario: 'food', type: 'word', hanzi: '菜单', pinyin: 'cài dān', gloss: 'menu', emoji: '📋' },
    { id: 'zh-f09', scenario: 'food', type: 'chunk', hanzi: '好吃', pinyin: 'hǎo chī', gloss: 'delicious', emoji: '😋' },
    { id: 'zh-f10', scenario: 'food', type: 'chunk', hanzi: '买单', pinyin: 'mǎi dān', gloss: 'the bill, please', emoji: '🧾' },
    { id: 'zh-f11', scenario: 'food', type: 'chunk', hanzi: '我饿了', pinyin: 'wǒ è le', gloss: "I'm hungry", emoji: '🤤' },
    { id: 'zh-f12', scenario: 'food', type: 'chunk', hanzi: '不要辣', pinyin: 'bú yào là', gloss: 'not spicy, please', emoji: '🌶️' },

    // ---- Taxi & Directions ----
    { id: 'zh-t01', scenario: 'taxi', type: 'word', hanzi: '出租车', pinyin: 'chū zū chē', gloss: 'taxi', emoji: '🚕' },
    { id: 'zh-t02', scenario: 'taxi', type: 'chunk', hanzi: '去机场', pinyin: 'qù jī chǎng', gloss: 'to the airport', emoji: '✈️' },
    { id: 'zh-t03', scenario: 'taxi', type: 'chunk', hanzi: '在哪里', pinyin: 'zài nǎ lǐ', gloss: 'where is…?', emoji: '📍' },
    { id: 'zh-t04', scenario: 'taxi', type: 'sentence', hanzi: '洗手间在哪里', pinyin: 'xǐ shǒu jiān zài nǎ lǐ', gloss: 'where is the bathroom?', emoji: '🚻' },
    { id: 'zh-t05', scenario: 'taxi', type: 'chunk', hanzi: '左转', pinyin: 'zuǒ zhuǎn', gloss: 'turn left', emoji: '⬅️' },
    { id: 'zh-t06', scenario: 'taxi', type: 'chunk', hanzi: '右转', pinyin: 'yòu zhuǎn', gloss: 'turn right', emoji: '➡️' },
    { id: 'zh-t07', scenario: 'taxi', type: 'chunk', hanzi: '一直走', pinyin: 'yì zhí zǒu', gloss: 'go straight', emoji: '⬆️' },
    { id: 'zh-t08', scenario: 'taxi', type: 'chunk', hanzi: '停这里', pinyin: 'tíng zhè lǐ', gloss: 'stop here', emoji: '🛑' },
    { id: 'zh-t09', scenario: 'taxi', type: 'chunk', hanzi: '远吗', pinyin: 'yuǎn ma', gloss: 'is it far?', emoji: '🗺️' },
    { id: 'zh-t10', scenario: 'taxi', type: 'word', hanzi: '很近', pinyin: 'hěn jìn', gloss: 'very close', emoji: '📏' },
    { id: 'zh-t11', scenario: 'taxi', type: 'chunk', hanzi: '慢一点', pinyin: 'màn yì diǎn', gloss: 'slower, please', emoji: '🐢' },
    { id: 'zh-t12', scenario: 'taxi', type: 'chunk', hanzi: '到了', pinyin: 'dào le', gloss: 'we have arrived', emoji: '🏁' },

    // ---- Small Talk & Rescue Phrases ----
    { id: 'zh-r01', scenario: 'repair', type: 'chunk', hanzi: '你好吗', pinyin: 'nǐ hǎo ma', gloss: 'how are you?', emoji: '🙂' },
    { id: 'zh-r02', scenario: 'repair', type: 'chunk', hanzi: '我很好', pinyin: 'wǒ hěn hǎo', gloss: "I'm fine", emoji: '😄' },
    { id: 'zh-r03', scenario: 'repair', type: 'chunk', hanzi: '你呢', pinyin: 'nǐ ne', gloss: 'and you?', emoji: '🔁' },
    { id: 'zh-r04', scenario: 'repair', type: 'chunk', hanzi: '听不懂', pinyin: 'tīng bu dǒng', gloss: "I don't understand (hearing)", emoji: '🤷' },
    { id: 'zh-r05', scenario: 'repair', type: 'sentence', hanzi: '请再说一遍', pinyin: 'qǐng zài shuō yí biàn', gloss: 'please say it again', emoji: '🔂' },
    { id: 'zh-r06', scenario: 'repair', type: 'sentence', hanzi: '请说慢一点', pinyin: 'qǐng shuō màn yì diǎn', gloss: 'please speak slower', emoji: '🐌' },
    { id: 'zh-r07', scenario: 'repair', type: 'sentence', hanzi: '中文怎么说', pinyin: 'zhōng wén zěn me shuō', gloss: 'how do you say it in Chinese?', emoji: '❓' },
    { id: 'zh-r08', scenario: 'repair', type: 'sentence', hanzi: '我是马来西亚人', pinyin: 'wǒ shì mǎ lái xī yà rén', gloss: "I'm Malaysian", emoji: '🇲🇾' },
    { id: 'zh-r09', scenario: 'repair', type: 'sentence', hanzi: '你是哪国人', pinyin: 'nǐ shì nǎ guó rén', gloss: 'which country are you from?', emoji: '🌏' },
    { id: 'zh-r10', scenario: 'repair', type: 'chunk', hanzi: '一点点', pinyin: 'yì diǎn diǎn', gloss: 'a little bit', emoji: '🤏' },
    { id: 'zh-r11', scenario: 'repair', type: 'sentence', hanzi: '我在学中文', pinyin: 'wǒ zài xué zhōng wén', gloss: "I'm learning Chinese", emoji: '📚' },
    { id: 'zh-r12', scenario: 'repair', type: 'chunk', hanzi: '没问题', pinyin: 'méi wèn tí', gloss: 'no problem', emoji: '👍' },
  ],
};
