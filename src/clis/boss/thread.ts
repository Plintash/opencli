import { cli, Strategy } from '../../registry.js';
import { bossFetch, findGeekFriendByUid, navigateToGeekChat, requirePage } from './utils.js';

const TYPE_MAP: Record<number, string> = {
  1: '文本',
  2: '图片',
  3: '招呼',
  4: '卡片',
  5: '系统',
  6: '名片',
  7: '语音',
  8: '视频',
  9: '表情',
  16: '信息卡',
};

function extractMessageText(message: any): string {
  if (message.text) return message.text;
  if (message.body?.text) return message.body.text;
  if (message.pushText) return message.pushText;
  if (message.body?.headTitle) return message.body.headTitle;

  const article = message.body?.articles?.[0];
  if (article?.title && article?.description) return `${article.title} ${article.description}`.trim();
  if (article?.title) return article.title;

  const job = message.body?.jobDesc;
  if (job?.title && job?.company) return `${job.company} ${job.title}`.trim();
  if (job?.title) return job.title;

  return '';
}

cli({
  site: 'boss',
  name: 'thread',
  aliases: ['geekchatmsg'],
  description: 'BOSS直聘查看聊天消息线程（求职端）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, positional: true, help: 'Encrypted UID (from inbox)' },
    { name: 'page', type: 'int', default: 1, help: 'Page number' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of messages to return' },
    { name: 'raw', type: 'boolean', default: false, help: 'Include raw message payload JSON' },
  ],
  columns: ['from', 'type', 'text', 'time'],
  func: async (page, kwargs) => {
    requirePage(page);
    await navigateToGeekChat(page);

    const friend = await findGeekFriendByUid(page, kwargs.uid, { maxPages: 3 });
    if (!friend) throw new Error('未找到该聊天会话');

    const count = Math.max(1, Number(kwargs.limit || 20));
    const includeRaw = Boolean(kwargs.raw);
    const securityId = encodeURIComponent(friend.securityId);
    const msgUrl = `https://www.zhipin.com/wapi/zpchat/geek/historyMsg?gid=${friend.uid}&securityId=${securityId}&page=${kwargs.page || 1}&c=${count}&src=0`;
    const msgData = await bossFetch(page, msgUrl);
    const messages = msgData.zpData?.messages || msgData.zpData?.historyMsgList || [];

    return messages.slice(0, count).map((m: any) => {
      const row: Record<string, unknown> = {
        from: m.from?.uid === friend.uid ? (m.from?.name || friend.name || '对方') : '我',
        type: TYPE_MAP[m.type] || `其他(${m.type})`,
        text: extractMessageText(m),
        time: m.time ? new Date(m.time).toLocaleString('zh-CN') : '',
      };
      if (includeRaw) row.raw = m;
      return row;
    });
  },
});
