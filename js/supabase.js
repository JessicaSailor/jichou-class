/* ===== Supabase 连接配置 ===== */

const SUPABASE_URL = 'https://qqwiktvtbdueaiqmnbun.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uGDnc8b0n0H98f1V7lukAA_JZ8G4LLS';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* ===== 数据操作封装 ===== */

const DB = {
  // 获取所有学员
  async getMembers() {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('id');
    if (error) { console.error('getMembers error:', error); return []; }
    return data;
  },

  // 获取所有活动
  async getActivities() {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getActivities error:', error); return []; }
    return data;
  },

  // 新增活动并自动扣款
  async addActivity(name, date, totalCost, participants) {
    const { error } = await supabase.rpc('add_activity_and_deduct', {
      p_name: name,
      p_date: date,
      p_total_cost: totalCost,
      p_participants: participants
    });
    if (error) { console.error('addActivity error:', error); return false; }
    return true;
  },

  // 删除活动并退款
  async deleteActivity(activityId) {
    const { error } = await supabase.rpc('delete_activity_and_refund', {
      p_activity_id: activityId
    });
    if (error) { console.error('deleteActivity error:', error); return false; }
    return true;
  },

  // 获取班级风采
  async getGallery() {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('event_date', { ascending: false });
    if (error) { console.error('getGallery error:', error); return []; }
    return data;
  },

  // 上传照片
  async uploadPhoto(file) {
    const fileName = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const { data, error } = await supabase.storage
      .from('photos')
      .upload(fileName, file);
    if (error) { console.error('uploadPhoto error:', error); return null; }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(fileName);
    return urlData.publicUrl;
  },

  // 新增风采记录
  async addGalleryItem(title, description, imageUrl, eventDate) {
    const { error } = await supabase
      .from('gallery')
      .insert({ title, description, image_url: imageUrl, event_date: eventDate });
    if (error) { console.error('addGalleryItem error:', error); return false; }
    return true;
  },

  // 删除风采记录
  async deleteGalleryItem(id) {
    const { error } = await supabase.from('gallery').delete().eq('id', id);
    if (error) { console.error('deleteGalleryItem error:', error); return false; }
    return true;
  },

  // 获取学员心得
  async getReflections() {
    const { data, error } = await supabase
      .from('reflections')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('getReflections error:', error); return []; }
    return data;
  },

  // 发布心得
  async addReflection(authorName, content) {
    const { error } = await supabase
      .from('reflections')
      .insert({ author_name: authorName, content });
    if (error) { console.error('addReflection error:', error); return false; }
    return true;
  },

  // 删除心得
  async deleteReflection(id) {
    const { error } = await supabase.from('reflections').delete().eq('id', id);
    if (error) { console.error('deleteReflection error:', error); return false; }
    return true;
  },

  // 验证管理员密码
  async verifyAdmin(password) {
    const { data, error } = await supabase
      .from('admin_config')
      .select('value')
      .eq('key', 'admin_password')
      .single();
    if (error) { console.error('verifyAdmin error:', error); return false; }
    return data.value === password;
  }
};
