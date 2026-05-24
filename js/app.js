/* ===== 己丑班 - 主应用逻辑（Supabase版） ===== */

(function() {
  'use strict';

  let isAdmin = false;
  let members = [];
  let courses = [];
  let activities = [];
  let reflections = [];
  let galleryItems = [];
  let useSupabase = typeof DB !== 'undefined';

  // ===== 初始化 =====
  async function init() {
    await loadData();
    initNavigation();
    initAdmin();
    renderCommittee();
    renderCourse();
    renderRoster();
    renderFinance();
    renderReflections();
    renderGallery();
    initFinanceForm();
    initReflectionForm();
    initGalleryForm();
  }

  // ===== 加载数据 =====
  async function loadData() {
    try {
      // 课程数据始终从JSON加载
      const courseRes = await fetch('data/course.json');
      courses = await courseRes.json();

      if (useSupabase) {
        members = await DB.getMembers();
        activities = await DB.getActivities();
        reflections = await DB.getReflections();
        galleryItems = await DB.getGallery();

        if (!members || members.length === 0) {
          // Supabase表为空，从JSON fallback
          const memberRes = await fetch('data/members.json');
          members = await memberRes.json();
          members.forEach(m => { if (m.balance === undefined) m.balance = 1500; });
          useSupabase = false;
        }
      } else {
        const memberRes = await fetch('data/members.json');
        members = await memberRes.json();
        members.forEach(m => { if (m.balance === undefined) m.balance = 1500; });
        activities = JSON.parse(localStorage.getItem('jc_activities') || '[]');
        reflections = JSON.parse(localStorage.getItem('jc_reflections') || '[]');
      }
    } catch(e) {
      console.error('数据加载失败:', e);
      // 最终fallback
      const memberRes = await fetch('data/members.json');
      members = await memberRes.json();
      members.forEach(m => { if (m.balance === undefined) m.balance = 1500; });
      useSupabase = false;
    }
  }

  // ===== 导航 =====
  function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.getElementById('mainNav');

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const section = item.dataset.section;
        switchSection(section);
        navItems.forEach(n => n.classList.remove('active'));
        item.classList.add('active');
        nav.classList.remove('open');
      });
    });

    menuToggle.addEventListener('click', () => {
      nav.classList.toggle('open');
    });

    const hash = window.location.hash.slice(1);
    if (hash) {
      switchSection(hash);
      navItems.forEach(n => {
        n.classList.toggle('active', n.dataset.section === hash);
      });
    }
  }

  function switchSection(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('section-' + name);
    if (target) target.classList.add('active');
    window.location.hash = name;
  }

  // ===== 管理员 =====
  function initAdmin() {
    const btn = document.getElementById('adminBtn');
    const modal = document.getElementById('adminModal');
    const loginBtn = document.getElementById('adminLogin');
    const cancelBtn = document.getElementById('adminCancel');
    const pwdInput = document.getElementById('adminPwd');
    const errMsg = document.getElementById('adminError');

    btn.addEventListener('click', () => {
      if (isAdmin) {
        isAdmin = false;
        btn.classList.remove('logged-in');
        btn.title = '管理员';
        toggleAdminUI();
        return;
      }
      modal.classList.add('show');
      pwdInput.value = '';
      errMsg.textContent = '';
      setTimeout(() => pwdInput.focus(), 100);
    });

    loginBtn.addEventListener('click', async () => {
      const pwd = pwdInput.value;
      let valid = false;

      if (useSupabase) {
        valid = await DB.verifyAdmin(pwd);
      } else {
        valid = pwd === 'jichou2026';
      }

      if (valid) {
        isAdmin = true;
        btn.classList.add('logged-in');
        btn.title = '点击退出管理';
        modal.classList.remove('show');
        toggleAdminUI();
      } else {
        errMsg.textContent = '密码错误';
      }
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('show'));
    pwdInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') loginBtn.click();
    });
  }

  function toggleAdminUI() {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = isAdmin ? 'block' : 'none';
    });
    document.querySelectorAll('.admin-action').forEach(el => {
      el.style.display = isAdmin ? 'inline-block' : 'none';
    });
    // 重新渲染含管理按钮的区域
    renderFinance();
    renderReflections();
    renderGallery();
  }

  // ===== 班委展示 =====
  function renderCommittee() {
    const grid = document.getElementById('committeeGrid');
    const roleOrder = ['班长', '班副', '组织', '学委', '财务', '纪律', '宣传'];
    const roleGroups = {};
    roleOrder.forEach(r => { roleGroups[r] = []; });

    members.filter(m => m.class_role).forEach(m => {
      if (roleGroups[m.class_role]) roleGroups[m.class_role].push(m);
    });

    grid.innerHTML = roleOrder
      .filter(role => roleGroups[role].length > 0)
      .map(role => `
        <div class="committee-row">
          <span class="committee-row-label">${role}</span>
          ${roleGroups[role].map(m => `<span class="committee-name">${m.name}</span>`).join('')}
        </div>
      `).join('');
  }

  // ===== 课程时间线 =====
  function renderCourse() {
    const timeline = document.getElementById('courseTimeline');
    const now = new Date();
    const currentIdx = getCurrentCourseIndex();

    timeline.innerHTML = courses.map((c, i) => {
      let status = 'upcoming';
      let statusText = '即将';
      const dateMatch = c.date.match(/(\d+)月(\d+)/);

      if (dateMatch) {
        const courseDate = new Date(2026, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
        if (now > courseDate) {
          status = 'past';
          statusText = '已完成';
        }
      }

      const isCurrent = (i === currentIdx);
      if (isCurrent) { status = 'current'; statusText = '进行中'; }

      return `
        <div class="timeline-item ${status}" onclick="this.classList.toggle('expanded')">
          <div class="timeline-number">
            ${c.number}
            <span class="timeline-status status-${status === 'past' ? 'done' : status === 'current' ? 'current' : 'upcoming'}">
              ${statusText}
            </span>
          </div>
          <div class="timeline-date">${c.date}</div>
          <div class="timeline-content">${c.content}</div>
          <div class="timeline-goal">${c.goal}</div>
        </div>
      `;
    }).join('');
  }

  function getCurrentCourseIndex() {
    const now = new Date();
    for (let i = 0; i < courses.length; i++) {
      const dateMatch = courses[i].date.match(/(\d+)月(\d+)/);
      if (dateMatch) {
        const courseDate = new Date(2026, parseInt(dateMatch[1]) - 1, parseInt(dateMatch[2]));
        if (courseDate > now) return i;
      }
    }
    return -1;
  }

  // ===== 同学录 =====
  function renderRoster() {
    const grid = document.getElementById('rosterGrid');
    const stems = [
      { stem: '甲', label: '甲木' }, { stem: '乙', label: '乙木' },
      { stem: '丙', label: '丙火' }, { stem: '丁', label: '丁火' },
      { stem: '戊', label: '戊土' }, { stem: '己', label: '己土' },
      { stem: '庚', label: '庚金' }, { stem: '辛', label: '辛金' },
      { stem: '壬', label: '壬水' }, { stem: '癸', label: '癸水' }
    ];

    const getDayMaster = (bazi) => bazi ? bazi.replace(/\s/g, '')[4] : '';

    grid.innerHTML = stems
      .map(({ stem, label }) => {
        const group = members.filter(m => getDayMaster(m.bazi) === stem);
        if (group.length === 0) return '';
        return `
          <div class="roster-group">
            <div class="roster-group-label">${label}</div>
            <div class="roster-group-cards">
              ${group.map(m => {
                const genderIcon = m.gender === '乾' ? '☰' : '☷';
                return `
                  <div class="roster-card" onclick="this.classList.toggle('flipped')">
                    <div class="roster-card-inner">
                      <div class="roster-front">
                        <div class="roster-gender" title="${m.gender}">${genderIcon}</div>
                        <div class="roster-name">${m.name}</div>
                        ${m.class_role ? `<div class="roster-role">${m.class_role}</div>` : ''}
                      </div>
                      <div class="roster-back">
                        <div class="roster-bazi">${formatBazi(m.bazi)}</div>
                        <div class="roster-note">${m.note || ''}</div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('');
  }

  function formatBazi(bazi) {
    if (!bazi) return '';
    const clean = bazi.replace(/\s/g, '');
    if (clean.length === 8) {
      return clean.slice(0,2) + ' ' + clean.slice(2,4) + ' ' + clean.slice(4,6) + ' ' + clean.slice(6,8);
    }
    return bazi;
  }

  // ===== 收支公示 =====
  function renderFinance() {
    const totalExpense = activities.reduce((sum, a) => sum + parseFloat(a.total_cost || 0), 0);
    document.getElementById('totalExpense').textContent = '¥' + totalExpense.toLocaleString();
    document.getElementById('totalBalance').textContent = '¥' + (78000 - totalExpense).toLocaleString();

    // 名单datalist
    const datalist = document.getElementById('memberNames');
    datalist.innerHTML = members.map(m => `<option value="${m.name}">`).join('');

    // 活动列表
    const list = document.getElementById('activityList');
    if (activities.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>暂无支出记录</p></div>';
    } else {
      list.innerHTML = activities.map((a) => {
        const participants = a.participants || [];
        const perPerson = participants.length > 0 ? (a.total_cost / participants.length).toFixed(2) : '0';
        return `
          <div class="activity-item">
            <div class="activity-header">
              <span class="activity-name">${a.name}</span>
              <span class="activity-cost">¥${parseFloat(a.total_cost).toLocaleString()}</span>
            </div>
            <div class="activity-meta">
              ${a.date} | ${participants.length}人参与 | 人均 ¥${perPerson}
            </div>
            ${isAdmin ? `<button class="btn btn-sm btn-secondary admin-action" onclick="window._deleteActivity(${a.id})">删除</button>` : ''}
          </div>
        `;
      }).join('');
    }

    // 查询功能
    document.getElementById('queryBtn').onclick = queryBalance;
  }

  function queryBalance() {
    const name = document.getElementById('queryName').value.trim();
    const result = document.getElementById('queryResult');
    const member = members.find(m => m.name === name);

    if (!member) {
      result.innerHTML = '<p style="color:var(--red)">未找到该学员，请检查姓名</p>';
    } else {
      const balance = parseFloat(member.balance || 1500);
      result.innerHTML = `
        <p><strong>${member.name}</strong> 的账户信息：</p>
        <p>初始班费：¥1,500.00</p>
        <p>当前余额：<strong style="color:${balance >= 0 ? 'var(--gold)' : 'var(--red)'}">¥${balance.toFixed(2)}</strong></p>
      `;
    }
    result.classList.add('show');
  }

  // ===== 活动费用表单 =====
  function initFinanceForm() {
    const addBtn = document.getElementById('addActivityBtn');
    const modal = document.getElementById('activityModal');
    const saveBtn = document.getElementById('saveActivity');
    const cancelBtn = document.getElementById('cancelActivity');
    const selectAll = document.getElementById('selectAll');
    const selectNone = document.getElementById('selectNone');
    const costInput = document.getElementById('activityCost');

    addBtn.addEventListener('click', () => {
      renderParticipantGrid();
      modal.classList.add('show');
    });

    cancelBtn.addEventListener('click', () => modal.classList.remove('show'));

    selectAll.addEventListener('click', () => {
      document.querySelectorAll('#participantGrid input').forEach(cb => cb.checked = true);
      updateCount(); updatePP();
    });

    selectNone.addEventListener('click', () => {
      document.querySelectorAll('#participantGrid input').forEach(cb => cb.checked = false);
      updateCount(); updatePP();
    });

    costInput.addEventListener('input', updatePP);

    saveBtn.addEventListener('click', async () => {
      const name = document.getElementById('activityName').value.trim();
      const date = document.getElementById('activityDate').value;
      const cost = parseFloat(document.getElementById('activityCost').value);
      const participants = getSelectedParticipants();

      if (!name) { alert('请输入活动名称'); return; }
      if (!date) { alert('请选择活动日期'); return; }
      if (!cost || cost <= 0) { alert('请输入有效费用'); return; }
      if (participants.length === 0) { alert('请选择参与人员'); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = '提交中...';

      let success = false;
      if (useSupabase) {
        success = await DB.addActivity(name, date, cost, participants);
        if (success) {
          activities = await DB.getActivities();
          members = await DB.getMembers();
        }
      } else {
        activities.push({ id: Date.now(), name, date, total_cost: cost, participants });
        localStorage.setItem('jc_activities', JSON.stringify(activities));
        recalcLocalBalances();
        success = true;
      }

      saveBtn.disabled = false;
      saveBtn.textContent = '确认提交';

      if (success) {
        renderFinance();
        modal.classList.remove('show');
        document.getElementById('activityName').value = '';
        document.getElementById('activityDate').value = '';
        document.getElementById('activityCost').value = '';
      } else {
        alert('提交失败，请重试');
      }
    });
  }

  function renderParticipantGrid() {
    const grid = document.getElementById('participantGrid');
    grid.innerHTML = members.map(m => `
      <label class="participant-item">
        <input type="checkbox" value="${m.name}" onchange="window._updateCount(); window._updatePP();">
        ${m.name}
      </label>
    `).join('');
  }

  function getSelectedParticipants() {
    return Array.from(document.querySelectorAll('#participantGrid input:checked')).map(cb => cb.value);
  }

  function updateCount() {
    const count = document.querySelectorAll('#participantGrid input:checked').length;
    document.getElementById('selectedCount').textContent = '已选: ' + count + '人';
  }

  function updatePP() {
    const cost = parseFloat(document.getElementById('activityCost').value) || 0;
    const count = document.querySelectorAll('#participantGrid input:checked').length;
    document.getElementById('perPerson').textContent = count > 0 ? '¥' + (cost / count).toFixed(2) : '--';
  }

  function recalcLocalBalances() {
    members.forEach(m => m.balance = 1500);
    activities.forEach(act => {
      const pp = act.total_cost / act.participants.length;
      act.participants.forEach(name => {
        const member = members.find(m => m.name === name);
        if (member) member.balance -= pp;
      });
    });
  }

  // 全局函数
  window._updateCount = updateCount;
  window._updatePP = updatePP;

  window._deleteActivity = async function(id) {
    if (!confirm('确定删除此条记录？对应费用将退还参与者。')) return;
    if (useSupabase) {
      const success = await DB.deleteActivity(id);
      if (success) {
        activities = await DB.getActivities();
        members = await DB.getMembers();
        renderFinance();
      }
    } else {
      activities = activities.filter(a => a.id !== id);
      localStorage.setItem('jc_activities', JSON.stringify(activities));
      recalcLocalBalances();
      renderFinance();
    }
  };

  // ===== 班级风采 =====
  function renderGallery() {
    const grid = document.getElementById('galleryGrid');
    if (!galleryItems || galleryItems.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <p>🎬 精彩即将呈现</p>
          <p class="hint">班级活动照片将在这里展示</p>
        </div>
      `;
      return;
    }
    grid.innerHTML = galleryItems.map(item => `
      <div class="gallery-card">
        <img src="${item.image_url}" alt="${item.title}" loading="lazy">
        <div class="caption">
          <div class="caption-title">${item.title}</div>
          <div class="caption-date">${item.event_date || ''} ${item.description ? '· ' + item.description : ''}</div>
          ${isAdmin ? `<button class="btn btn-sm btn-secondary admin-action" onclick="window._deleteGallery(${item.id})">删除</button>` : ''}
        </div>
      </div>
    `).join('');
  }

  function initGalleryForm() {
    const uploadBtn = document.getElementById('uploadPhotoBtn');
    const modal = document.getElementById('photoModal');
    const saveBtn = document.getElementById('savePhoto');
    const cancelBtn = document.getElementById('cancelPhoto');
    const fileInput = document.getElementById('photoFile');
    const preview = document.getElementById('photoPreview');

    uploadBtn.addEventListener('click', () => modal.classList.add('show'));
    cancelBtn.addEventListener('click', () => modal.classList.remove('show'));

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) {
        const url = URL.createObjectURL(file);
        preview.innerHTML = `<img src="${url}" style="max-width:100%;max-height:200px;margin-top:8px;border-radius:4px;">`;
      }
    });

    saveBtn.addEventListener('click', async () => {
      const title = document.getElementById('photoTitle').value.trim();
      const date = document.getElementById('photoDate').value;
      const desc = document.getElementById('photoDesc').value.trim();
      const file = fileInput.files[0];

      if (!title) { alert('请输入标题'); return; }
      if (!file) { alert('请选择照片'); return; }

      saveBtn.disabled = true;
      saveBtn.textContent = '上传中...';

      if (useSupabase) {
        const imageUrl = await DB.uploadPhoto(file);
        if (imageUrl) {
          await DB.addGalleryItem(title, desc, imageUrl, date || null);
          galleryItems = await DB.getGallery();
          renderGallery();
          modal.classList.remove('show');
          // 清空表单
          document.getElementById('photoTitle').value = '';
          document.getElementById('photoDate').value = '';
          document.getElementById('photoDesc').value = '';
          fileInput.value = '';
          preview.innerHTML = '';
        } else {
          alert('照片上传失败，请重试');
        }
      } else {
        alert('照片上传需要 Supabase 云存储支持。请先配置数据库。');
      }

      saveBtn.disabled = false;
      saveBtn.textContent = '上传';
    });
  }

  window._deleteGallery = async function(id) {
    if (!confirm('确定删除此照片？')) return;
    if (useSupabase) {
      await DB.deleteGalleryItem(id);
      galleryItems = await DB.getGallery();
      renderGallery();
    }
  };

  // ===== 学员心得 =====
  function initReflectionForm() {
    document.getElementById('submitRefl').addEventListener('click', async () => {
      const author = document.getElementById('reflAuthor').value.trim();
      const content = document.getElementById('reflContent').value.trim();
      if (!author || !content) { alert('请填写姓名和心得内容'); return; }

      if (useSupabase) {
        const success = await DB.addReflection(author, content);
        if (success) {
          reflections = await DB.getReflections();
          renderReflections();
        }
      } else {
        reflections.unshift({
          id: Date.now(),
          author_name: author,
          content,
          created_at: new Date().toISOString()
        });
        localStorage.setItem('jc_reflections', JSON.stringify(reflections));
        renderReflections();
      }

      document.getElementById('reflAuthor').value = '';
      document.getElementById('reflContent').value = '';
    });
  }

  function renderReflections() {
    const list = document.getElementById('reflectionList');
    if (!reflections || reflections.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>📝 期待你的第一篇心得</p></div>';
      return;
    }
    list.innerHTML = reflections.map(r => {
      const author = r.author_name || r.author || '';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('zh-CN') : '';
      return `
        <div class="reflection-card">
          ${isAdmin ? `<button class="reflection-delete admin-action" onclick="window._deleteReflection(${r.id})">✕</button>` : ''}
          <div class="reflection-author">${escapeHtml(author)}</div>
          <div class="reflection-date">${date}</div>
          <div class="reflection-text">${escapeHtml(r.content)}</div>
        </div>
      `;
    }).join('');
  }

  window._deleteReflection = async function(id) {
    if (!confirm('确定删除此条心得？')) return;
    if (useSupabase) {
      await DB.deleteReflection(id);
      reflections = await DB.getReflections();
    } else {
      reflections = reflections.filter(r => r.id !== id);
      localStorage.setItem('jc_reflections', JSON.stringify(reflections));
    }
    renderReflections();
  };

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // ===== 启动 =====
  document.addEventListener('DOMContentLoaded', init);
})();
