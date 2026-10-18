/**
 * All user-facing copy lives here. Turkish first; swap the object to localize.
 * Tone: casual, a little cheeky. This is a gossip app, not a bank.
 */
export const S = {
  appName: 'Gossiptown',
  tagline: 'Mahallenin dedikodusu, sadece mahalleliye.',

  onboarding: {
    heroTitle: 'Mahallende neler oluyor?',
    heroBody:
      'Sadece bulunduğun ilçenin sohbetini görürsün. Konumunu aç, seni yerleştirelim.',
    enableLocation: 'Konumu aç',
    locating: 'Mahallen bulunuyor…',
    permissionDenied:
      'Konum izni olmadan mahalleni bulamayız. Ayarlardan izin verip tekrar dene.',
    openSettings: 'Ayarları aç',
    retry: 'Tekrar dene',
    unsupportedTitle: 'Henüz burada değiliz',
    unsupportedBody: (city: string | null) =>
      `${city ?? 'Burası'} için yakında geliyoruz. Şimdilik İstanbul, Ankara ve İzmir’de aktifiz.`,
    pickNameTitle: 'Bir takma ad seç',
    pickNameBody: 'Gerçek adını kullanma. Mahallede seni bu isimle tanıyacaklar.',
    shuffle: 'Karıştır',
    continue: 'Devam',
    rules: [
      'Kimseyi tam adı, adresi veya fotoğrafıyla ifşa etme.',
      'Tehdit, nefret söylemi ve taciz yok.',
      'Şikayetleri 24 saat içinde inceliyoruz. Kural dışı içerik kaldırılır, hesaplar askıya alınır.',
    ],
    agree: 'Kuralları kabul ediyorum',
  },

  tabs: {
    threads: 'Konular',
    chat: 'Canlı',
    dms: 'Mesajlar',
    me: 'Ben',
  },

  dms: {
    title: 'Mesajlar',
    empty: 'Henüz kimseyle yazışmadın.\nBir paylaşıma uzun basıp “Mesaj gönder” de.',
    placeholder: 'Mesaj yaz…',
    you: 'Sen: ',
    contacts: 'Kişiler',
    contactsEmpty: 'Kaydettiğin kimse yok.\nBir paylaşıma uzun basıp “Kişilere ekle” de.',
    message: 'Mesaj gönder',
    addContact: 'Kişilere ekle',
    removeContact: 'Kişilerden çıkar',
    added: 'Kişilere eklendi.',
    cannotReach: 'Bu kişiye şu an ulaşamazsın. Aynı mahallede olman veya onu kişilerine eklemiş olman gerekir.',
    startChat: 'Yaz',
  },

  threads: {
    title: 'Konular',
    empty: 'Burada henüz kimse konuşmadı.\nİlk konuyu sen aç.',
    newThread: 'Yeni konu',
    titlePlaceholder: 'Ne oldu? Kısa bir başlık…',
    bodyPlaceholder: 'Detayları anlat… (isteğe bağlı)',
    post: 'Paylaş',
    replies: (n: number) => (n === 1 ? '1 yanıt' : `${n} yanıt`),
    noReplies: 'Henüz yanıt yok',
    replyPlaceholder: 'Yanıt yaz…',
    op: 'Konuyu açan',
    mine: 'Sen',
  },

  chat: {
    title: 'Canlı sohbet',
    empty: 'Sohbet sessiz. Bir şey söyle.',
    placeholder: 'Mahalleye yaz…',
    online: (n: number) => `${n} kişi burada`,
  },

  me: {
    title: 'Ben',
    nickname: 'Takma ad',
    neighborhood: 'Bölgen',
    changePhoto: 'Fotoğrafı değiştir',
    pickPhoto: 'Fotoğraf seç',
    removePhoto: 'Fotoğrafı kaldır',
    photoUploading: 'Yükleniyor…',
    photoTooBig: 'Fotoğraf 2 MB’den küçük olmalı.',
    refreshLocation: 'Konumu yenile',
    blocked: 'Engellenenler',
    noBlocked: 'Kimseyi engellemedin.',
    unblock: 'Engeli kaldır',
    rules: 'Topluluk kuralları',
    contact: 'Bize yaz',
    contactHint: 'Şikayet, itiraz veya soru için',
    contactSubject: 'Gossiptown destek',
    moderation: 'Moderasyon',
    moderationPending: (n: number) => (n > 0 ? `${n} içerik inceleme bekliyor` : 'Bekleyen şikayet yok'),
    signOut: 'Bu cihazdan çık',
    signOutConfirm:
      'Anonim hesabın bu cihazdan silinir ve geri alınamaz. Emin misin?',
    version: 'Sürüm',
  },

  actions: {
    report: 'Şikayet et',
    block: 'Kullanıcıyı engelle',
    delete: 'Sil',
    cancel: 'Vazgeç',
    copy: 'Kopyala',
    send: 'Gönder',
    ok: 'Tamam',
  },

  report: {
    title: 'Neden şikayet ediyorsun?',
    reasons: {
      doxxing: 'Kişisel bilgi ifşası',
      harassment: 'Taciz veya tehdit',
      hate: 'Nefret söylemi',
      sexual: 'Müstehcen içerik',
      spam: 'Spam',
      profile: 'Uygunsuz takma ad veya fotoğraf',
      other: 'Diğer',
    } as Record<string, string>,
    thanks: 'Teşekkürler, inceleyeceğiz.',
    blockedToast: 'Kullanıcı engellendi. Artık paylaşımlarını görmezsin.',
  },

  moderation: {
    title: 'Moderasyon',
    empty: 'Bekleyen şikayet yok. Mahalle sakin.',
    types: { message: 'Canlı', thread: 'Konu', reply: 'Yanıt', dm: 'Özel mesaj' } as Record<string, string>,
    reports: (n: number) => `${n} şikayet`,
    waiting: (ago: string) => `${ago} önce şikayet edildi`,
    overdue: '24 saati geçti',
    hidden: 'Otomatik gizlendi',
    deleted: 'Sahibi sildi',
    banned: 'Askıda',
    inThread: (title: string) => `“${title}” konusunda`,
    remove: 'Kaldır',
    removeAvatar: 'Fotoğrafı kaldır',
    ban: 'Askıya al',
    dismiss: 'Sorun yok',
    banTitle: 'Hesap askıya alınsın mı?',
    banBody: (nick: string) => `${nick} artık paylaşım ve mesaj gönderemeyecek. Bu içerik de kaldırılacak.`,
  },

  errors: {
    generic: 'Bir şeyler ters gitti. Tekrar dene.',
    tooFast: 'Biraz yavaş. Birkaç saniye sonra tekrar dene.',
    tooLong: 'Bu biraz uzun oldu.',
    profanity: 'Bu kelimelerle paylaşamazsın.',
    offline: 'İnternet yok gibi.',
    locationStale: 'Konumun eskidi. Yenilemek için dokun.',
    notInNeighborhood: 'Bu bölgede değilsin gibi görünüyor.',
  },

  time: {
    now: 'şimdi',
    m: (n: number) => `${n}dk`,
    h: (n: number) => `${n}sa`,
    d: (n: number) => `${n}g`,
  },
} as const;
