// Curated example sentences + generative patterns for the Mandarin survival deck.
// Rule: sentences use deck vocabulary plus a few glossed glue words (和, 用, 好吗)
// so every sentence becomes readable the moment its pieces are learned.

export interface SentenceEntry {
  id: string;
  itemIds: string[]; // deck items this sentence uses — unlocked when all are met
  hanzi: string;
  pinyin: string;
  gloss: string;
  scenario: string;
}

export interface SentencePattern {
  id: string;
  // {0}/{1} placeholders are filled with learned items' hanzi/pinyin/gloss
  hanzi: string;
  pinyin: string;
  gloss: string;
  slots: string[][]; // per placeholder: eligible deck item ids
  distinctSlots?: boolean; // when true, don't reuse the same item across slots
}

export const ZH_SENTENCES: SentenceEntry[] = [
  // Greetings & Basics
  { id: 'zs-01', itemIds: ['zh-g01', 'zh-r01'], scenario: 'greetings', hanzi: '你好！你好吗？', pinyin: 'nǐ hǎo nǐ hǎo ma', gloss: 'Hello! How are you?' },
  { id: 'zs-02', itemIds: ['zh-r02', 'zh-r03'], scenario: 'greetings', hanzi: '我很好，你呢？', pinyin: 'wǒ hěn hǎo nǐ ne', gloss: "I'm fine — and you?" },
  { id: 'zs-03', itemIds: ['zh-g08', 'zh-g10'], scenario: 'greetings', hanzi: '请问，你叫什么名字？', pinyin: 'qǐng wèn nǐ jiào shén me míng zi', gloss: "Excuse me, what's your name?" },
  { id: 'zs-04', itemIds: ['zh-g09', 'zh-g11'], scenario: 'greetings', hanzi: '我叫丹尼尔，很高兴认识你。', pinyin: 'wǒ jiào dān ní ěr hěn gāo xìng rèn shi nǐ', gloss: "I'm Daniel — nice to meet you." },
  { id: 'zs-05', itemIds: ['zh-g05', 'zh-g06'], scenario: 'greetings', hanzi: '对不起！— 没关系。', pinyin: 'duì bu qǐ méi guān xi', gloss: "Sorry! — It's okay." },
  { id: 'zs-06', itemIds: ['zh-g03', 'zh-g04'], scenario: 'greetings', hanzi: '谢谢！— 不客气。', pinyin: 'xiè xie bú kè qi', gloss: "Thanks! — You're welcome." },
  { id: 'zs-07', itemIds: ['zh-g12', 'zh-g07'], scenario: 'greetings', hanzi: '好的，再见！', pinyin: 'hǎo de zài jiàn', gloss: 'Okay — goodbye!' },

  // Numbers & Money
  { id: 'zs-08', itemIds: ['zh-g08', 'zh-n10', 'zh-n06'], scenario: 'numbers', hanzi: '请问，这个多少钱？', pinyin: 'qǐng wèn zhè ge duō shao qián', gloss: 'Excuse me, how much is this one?' },
  { id: 'zs-09', itemIds: ['zh-n09'], scenario: 'numbers', hanzi: '一共多少钱？', pinyin: 'yí gòng duō shao qián', gloss: 'How much in total?' },
  { id: 'zs-10', itemIds: ['zh-n07', 'zh-n08'], scenario: 'numbers', hanzi: '太贵了！便宜一点，好吗？', pinyin: 'tài guì le pián yi yì diǎn hǎo ma', gloss: 'Too expensive! A bit cheaper, okay? (好吗 = okay?)' },
  { id: 'zs-11', itemIds: ['zh-n12', 'zh-n11'], scenario: 'numbers', hanzi: '我要这个，不要那个。', pinyin: 'wǒ yào zhè ge bú yào nà ge', gloss: 'I want this one, not that one.' },
  { id: 'zs-12', itemIds: ['zh-f01', 'zh-n03', 'zh-n05'], scenario: 'numbers', hanzi: '一杯咖啡十块钱。', pinyin: 'yì bēi kā fēi shí kuài qián', gloss: 'A cup of coffee is ten kuai (块 = yuan, measure for money).' },

  // Food & Drink
  { id: 'zs-13', itemIds: ['zh-f07', 'zh-f08', 'zh-t03'], scenario: 'food', hanzi: '服务员，菜单在哪里？', pinyin: 'fú wù yuán cài dān zài nǎ lǐ', gloss: 'Waiter, where is the menu?' },
  { id: 'zs-14', itemIds: ['zh-f06', 'zh-f02'], scenario: 'food', hanzi: '我要一杯咖啡和一杯茶。', pinyin: 'wǒ yào yì bēi kā fēi hé yì bēi chá', gloss: 'I want a coffee and a tea. (和 = and)' },
  { id: 'zs-15', itemIds: ['zh-f11', 'zh-f04', 'zh-f05'], scenario: 'food', hanzi: '我饿了！我要米饭和面条。', pinyin: 'wǒ è le wǒ yào mǐ fàn hé miàn tiáo', gloss: "I'm hungry! I want rice and noodles." },
  { id: 'zs-16', itemIds: ['zh-f09', 'zh-g03'], scenario: 'food', hanzi: '很好吃！谢谢！', pinyin: 'hěn hǎo chī xiè xie', gloss: 'Very delicious! Thank you!' },
  { id: 'zs-17', itemIds: ['zh-f07', 'zh-f10'], scenario: 'food', hanzi: '服务员，买单！', pinyin: 'fú wù yuán mǎi dān', gloss: 'Waiter — the bill, please!' },
  { id: 'zs-18', itemIds: ['zh-f03', 'zh-f02'], scenario: 'food', hanzi: '我要水，不要茶。', pinyin: 'wǒ yào shuǐ bú yào chá', gloss: 'I want water, not tea.' },
  { id: 'zs-19', itemIds: ['zh-f12', 'zh-g03'], scenario: 'food', hanzi: '不要辣，谢谢。', pinyin: 'bú yào là xiè xie', gloss: 'Not spicy, thanks.' },

  // Taxi & Directions
  { id: 'zs-20', itemIds: ['zh-g01', 'zh-t02'], scenario: 'taxi', hanzi: '你好，我要去机场。', pinyin: 'nǐ hǎo wǒ yào qù jī chǎng', gloss: 'Hello, I want to go to the airport.' },
  { id: 'zs-21', itemIds: ['zh-g08', 'zh-t09'], scenario: 'taxi', hanzi: '请问，机场远吗？', pinyin: 'qǐng wèn jī chǎng yuǎn ma', gloss: 'Excuse me, is the airport far?' },
  { id: 'zs-22', itemIds: ['zh-t10'], scenario: 'taxi', hanzi: '不远，很近。', pinyin: 'bù yuǎn hěn jìn', gloss: 'Not far — very close.' },
  { id: 'zs-23', itemIds: ['zh-t07', 'zh-t05', 'zh-t12'], scenario: 'taxi', hanzi: '一直走，左转，到了！', pinyin: 'yì zhí zǒu zuǒ zhuǎn dào le', gloss: 'Go straight, turn left — we have arrived!' },
  { id: 'zs-24', itemIds: ['zh-t08', 'zh-g03'], scenario: 'taxi', hanzi: '请停这里，谢谢。', pinyin: 'qǐng tíng zhè lǐ xiè xie', gloss: 'Please stop here, thanks.' },
  { id: 'zs-25', itemIds: ['zh-t04'], scenario: 'taxi', hanzi: '请问，洗手间在哪里？', pinyin: 'qǐng wèn xǐ shǒu jiān zài nǎ lǐ', gloss: 'Excuse me, where is the bathroom?' },

  // Small Talk & Rescue
  { id: 'zs-26', itemIds: ['zh-g05', 'zh-r04'], scenario: 'repair', hanzi: '对不起，我听不懂。', pinyin: 'duì bu qǐ wǒ tīng bu dǒng', gloss: "Sorry, I don't understand." },
  { id: 'zs-27', itemIds: ['zh-r05', 'zh-t11'], scenario: 'repair', hanzi: '请再说一遍，慢一点。', pinyin: 'qǐng zài shuō yí biàn màn yì diǎn', gloss: 'Please say it again, a bit slower.' },
  { id: 'zs-28', itemIds: ['zh-r08', 'zh-r11'], scenario: 'repair', hanzi: '我是马来西亚人，我在学中文。', pinyin: 'wǒ shì mǎ lái xī yà rén wǒ zài xué zhōng wén', gloss: "I'm Malaysian — I'm learning Chinese." },
  { id: 'zs-29', itemIds: ['zh-r10', 'zh-r11'], scenario: 'repair', hanzi: '我说一点点中文。', pinyin: 'wǒ shuō yì diǎn diǎn zhōng wén', gloss: 'I speak a little bit of Chinese.' },
  { id: 'zs-30', itemIds: ['zh-n10', 'zh-r07'], scenario: 'repair', hanzi: '这个用中文怎么说？', pinyin: 'zhè ge yòng zhōng wén zěn me shuō', gloss: 'How do you say this in Chinese? (用 = using)' },

  // Time & Days
  { id: 'zs-31', itemIds: ['zh-ti02', 'zh-ti11', 'zh-ti03'], scenario: 'time', hanzi: '今天没有时间，明天好吗？', pinyin: 'jīn tiān méi yǒu shí jiān míng tiān hǎo ma', gloss: 'No time today — tomorrow, okay?' },
  { id: 'zs-32', itemIds: ['zh-ti12', 'zh-ti11'], scenario: 'time', hanzi: '快一点！没有时间了！', pinyin: 'kuài yì diǎn méi yǒu shí jiān le', gloss: "Hurry up! There's no time!" },
  { id: 'zs-33', itemIds: ['zh-g08', 'zh-ti10'], scenario: 'time', hanzi: '请问，几点开门？', pinyin: 'qǐng wèn jǐ diǎn kāi mén', gloss: 'Excuse me, what time do you open?' },

  // People & Family
  { id: 'zs-34', itemIds: ['zh-p03', 'zh-p10'], scenario: 'people', hanzi: '我朋友有两个孩子。', pinyin: 'wǒ péng you yǒu liǎng ge hái zi', gloss: 'My friend has two kids.' },
  { id: 'zs-35', itemIds: ['zh-p11', 'zh-p05'], scenario: 'people', hanzi: '他是谁？— 他是我哥哥。', pinyin: 'tā shì shéi tā shì wǒ gē ge', gloss: "Who is he? — He's my older brother." },
  { id: 'zs-36', itemIds: ['zh-p08', 'zh-g11'], scenario: 'people', hanzi: '这是我朋友。— 很高兴认识你！', pinyin: 'zhè shì wǒ péng you hěn gāo xìng rèn shi nǐ', gloss: 'This is my friend. — Nice to meet you!' },

  // Feelings & Reactions
  { id: 'zs-37', itemIds: ['zh-fe01', 'zh-fe02', 'zh-f01', 'zh-f02'], scenario: 'feelings', hanzi: '我喜欢咖啡，不喜欢茶。', pinyin: 'wǒ xǐ huan kā fēi bù xǐ huan chá', gloss: "I like coffee, I don't like tea." },
  { id: 'zs-38', itemIds: ['zh-fe05', 'zh-fe06', 'zh-fe10'], scenario: 'feelings', hanzi: '为什么？— 因为没意思。', pinyin: 'wèi shén me yīn wèi méi yì si', gloss: "Why? — Because it's boring." },
  { id: 'zs-39', itemIds: ['zh-fe07', 'zh-fe09'], scenario: 'feelings', hanzi: '真的吗？太好了！', pinyin: 'zhēn de ma tài hǎo le', gloss: "Really?! That's great!" },
  { id: 'zs-40', itemIds: ['zh-fe03', 'zh-c11'], scenario: 'feelings', hanzi: '我累了，我们改天吧。', pinyin: 'wǒ lèi le wǒ men gǎi tiān ba', gloss: "I'm tired — let's do it another day." },

  // Hotel & Wi-Fi
  { id: 'zs-41', itemIds: ['zh-g01', 'zh-h04'], scenario: 'hotel', hanzi: '你好，我有预订。', pinyin: 'nǐ hǎo wǒ yǒu yù dìng', gloss: 'Hello, I have a reservation.' },
  { id: 'zs-42', itemIds: ['zh-h02', 'zh-h09', 'zh-h10'], scenario: 'hotel', hanzi: '房间太吵了，可以换房间吗？', pinyin: 'fáng jiān tài chǎo le kě yǐ huàn fáng jiān ma', gloss: 'The room is too noisy — can I change rooms?' },
  { id: 'zs-43', itemIds: ['zh-h11', 'zh-h12'], scenario: 'hotel', hanzi: '我要退房，帮我叫出租车。', pinyin: 'wǒ yào tuì fáng bāng wǒ jiào chū zū chē', gloss: "I'd like to check out — please call me a taxi." },

  // Opinions & Chat
  { id: 'zs-44', itemIds: ['zh-c05', 'zh-c06'], scenario: 'chat', hanzi: '你做什么工作？— 我是学生。', pinyin: 'nǐ zuò shén me gōng zuò wǒ shì xué sheng', gloss: "What do you do? — I'm a student." },
  { id: 'zs-45', itemIds: ['zh-c08', 'zh-c09'], scenario: 'chat', hanzi: '周末我们一起去吧！', pinyin: 'zhōu mò wǒ men yì qǐ qù ba', gloss: "Let's go together this weekend!" },
  { id: 'zs-46', itemIds: ['zh-c10', 'zh-c04'], scenario: 'chat', hanzi: '好主意！明天见！', pinyin: 'hǎo zhǔ yi míng tiān jiàn', gloss: 'Good idea! See you tomorrow!' },
];

const DRINKS_FOOD = ['zh-f01', 'zh-f02', 'zh-f03', 'zh-f04', 'zh-f05'];

export const ZH_PATTERNS: SentencePattern[] = [
  {
    id: 'zp-01',
    hanzi: '我要{0}。',
    pinyin: 'wǒ yào {0}',
    gloss: 'I want {0}.',
    slots: [DRINKS_FOOD],
  },
  {
    id: 'zp-02',
    hanzi: '{0}多少钱？',
    pinyin: '{0} duō shao qián',
    gloss: 'How much is {0}?',
    slots: [['zh-n10', 'zh-n11', ...DRINKS_FOOD]],
  },
  {
    id: 'zp-03',
    hanzi: '{0}在哪里？',
    pinyin: '{0} zài nǎ lǐ',
    gloss: 'Where is {0}?',
    slots: [['zh-t01', 'zh-f08', 'zh-f07']],
  },
  {
    id: 'zp-04',
    hanzi: '我要{0}，不要{1}。',
    pinyin: 'wǒ yào {0} bú yào {1}',
    gloss: 'I want {0}, not {1}.',
    slots: [DRINKS_FOOD, DRINKS_FOOD],
    distinctSlots: true,
  },
  {
    id: 'zp-05',
    hanzi: '{0}，谢谢！',
    pinyin: '{0} xiè xie',
    gloss: '{0} — thanks!',
    slots: [['zh-f10', 'zh-t08', 'zh-n12']],
  },
  {
    id: 'zp-06',
    hanzi: '我喜欢{0}。',
    pinyin: 'wǒ xǐ huan {0}',
    gloss: 'I like {0}.',
    slots: [[...DRINKS_FOOD, 'zh-c08']],
  },
  {
    id: 'zp-07',
    hanzi: '我不喜欢{0}。',
    pinyin: 'wǒ bù xǐ huan {0}',
    gloss: "I don't like {0}.",
    slots: [DRINKS_FOOD],
  },
];
