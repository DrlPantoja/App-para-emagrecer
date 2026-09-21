(async function () {
  const config = window.SUPABASE_CONFIG || {};
  if (!window.supabase || !config.url || !config.anonKey) return;

  const client = window.supabase.createClient(config.url, config.anonKey);
  let { data: authData } = await client.auth.getUser();

  if (!authData.user) {
    const result = await client.auth.signInAnonymously();
    authData = result.data;
  }

  if (!authData?.user) return;

  const userId = authData.user.id;
  const [profileResult, diaryResult] = await Promise.all([
    client.from('profiles').select('*').eq('id', userId).maybeSingle(),
    client.from('diary_entries').select('entry_date, food_id, quantity').eq('user_id', userId)
  ]);

  if (profileResult.data) {
    const cloudProfile = profileResult.data;
    const localProfile = JSON.parse(localStorage.getItem('pratoProfile') || '{}');
    localStorage.setItem('pratoProfile', JSON.stringify({
      ...localProfile,
      name: cloudProfile.name,
      weight: cloudProfile.weight,
      height: cloudProfile.height,
      age: cloudProfile.age,
      goal: cloudProfile.goal,
      kcal: cloudProfile.kcal,
      p: cloudProfile.protein,
      c: cloudProfile.carbs,
      f: cloudProfile.fats,
      s: cloudProfile.sugar
    }));
  }

  if (diaryResult.data?.length) {
    const cloudDiary = {};
    diaryResult.data.forEach((entry) => {
      (cloudDiary[entry.entry_date] ||= []).push({ id: entry.food_id, qty: Number(entry.quantity) });
    });
    localStorage.setItem('pratoDiary', JSON.stringify(cloudDiary));
  }

  const originalSetItem = localStorage.setItem.bind(localStorage);
  let syncing = false;
  localStorage.setItem = function (key, value) {
    originalSetItem(key, value);
    if (!syncing && (key === 'pratoProfile' || key === 'pratoDiary')) sync();
  };

  async function sync() {
    syncing = true;
    try {
      const localProfile = JSON.parse(localStorage.getItem('pratoProfile') || '{}');
      const localDiary = JSON.parse(localStorage.getItem('pratoDiary') || '{}');
      await client.from('profiles').upsert({
        id: userId,
        name: localProfile.name || 'Você',
        weight: localProfile.weight,
        height: localProfile.height,
        age: localProfile.age,
        goal: localProfile.goal || 'lose',
        kcal: localProfile.kcal || 1850,
        protein: localProfile.p || 160,
        carbs: localProfile.c || 185,
        fats: localProfile.f || 62,
        sugar: localProfile.s || 46,
        updated_at: new Date().toISOString()
      });
      await client.from('diary_entries').delete().eq('user_id', userId);
      const entries = Object.entries(localDiary).flatMap(([entryDate, items]) => items.map((item) => ({
        user_id: userId,
        entry_date: entryDate,
        food_id: item.id,
        quantity: item.qty || 1
      })));
      if (entries.length) await client.from('diary_entries').insert(entries);
    } finally {
      syncing = false;
    }
  }
}());