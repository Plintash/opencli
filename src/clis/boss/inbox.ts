import { cli, Strategy } from '../../registry.js';
import { fetchGeekFriendList, navigateToGeekChat, requirePage } from './utils.js';

function normalizeGeekFriend(item: any) {
  return {
    boss_name: item.name || item.bossName || '',
    company: item.brandName || item.companyName || '',
    job: item.title || item.jobName || '',
    last_msg: item.lastMessageInfo?.text || item.lastMsg || '',
    last_time: item.lastTime || item.lastMsgTime || item.time || '',
    unread: item.unreadCount ?? item.unreadNum ?? item.unread ?? 0,
    uid: item.encryptBossId || item.encryptUid || item.uid || item.friendId || '',
    security_id: item.securityId || '',
    encrypt_job_id: item.encryptJobId || item.jobId || '',
  };
}

cli({
  site: 'boss',
  name: 'inbox',
  aliases: ['geekchatlist'],
  description: 'BOSS直聘查看聊天列表（求职端）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: 'Page number' },
    { name: 'limit', type: 'int', default: 20, help: 'Number of results' },
  ],
  columns: ['boss_name', 'company', 'job', 'last_msg', 'last_time', 'unread', 'uid', 'security_id', 'encrypt_job_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    await navigateToGeekChat(page);

    const friends = await fetchGeekFriendList(page, {
      pageNum: kwargs.page || 1,
    });

    return friends.slice(0, kwargs.limit || 20).map(normalizeGeekFriend);
  },
});
