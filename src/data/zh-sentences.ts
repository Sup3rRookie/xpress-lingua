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
];
