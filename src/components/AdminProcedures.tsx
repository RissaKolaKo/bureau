import { useState, useEffect } from 'react';

interface Step { step: string; fr: string; }
interface Procedure {
  id: string; titleAr: string; titleFr: string; category: string;
  icon: string; color: string; duration: string; cost: string;
  where: string; whereFr: string; description: string;
  steps: Step[]; documents: string[]; notes?: string;
  online?: string; law?: string;
}

const PROCEDURES: Procedure[] = [

  /* ═══════════════════════════════════════════════
     1. CARTE NATIONALE D'IDENTITÉ
  ════════════════════════════════════════════════ */
  {
    id: 'cin-new',
    titleAr: 'استخراج بطاقة التعريف الوطنية (أول مرة)',
    titleFr: "Carte Nationale d'Identité — Première Demande",
    category: 'cin', icon: '🪪', color: '#0891b2',
    duration: '15–30 يوم عمل', cost: 'مجاناً — Gratuit',
    where: 'مركز الشرطة أو الدرك الملكي', whereFr: 'Commissariat / Brigade de Gendarmerie',
    description: 'استخراج بطاقة التعريف الوطنية لأول مرة للمواطنين المغاربة البالغين 18 سنة فأكثر.',
    law: 'القانون رقم 99-35 المتعلق ببطاقة التعريف الوطنية',
    steps: [
      { step: '1. جمع الوثائق المطلوبة', fr: 'Rassembler les documents requis' },
      { step: '2. التوجه إلى أقرب مركز شرطة أو درك', fr: 'Se rendre au commissariat ou brigade' },
      { step: '3. ملء استمارة الطلب', fr: 'Remplir le formulaire de demande' },
      { step: '4. أخذ بصمات الأصابع والصورة البيومترية', fr: 'Prise des empreintes et photo biométrique' },
      { step: '5. الحصول على وصل استلام الملف', fr: 'Obtenir le récépissé de dépôt' },
      { step: '6. استلام البطاقة الوطنية بالشخص', fr: 'Retirer la carte en personne' },
    ],
    documents: ['شهادة الميلاد كاملة (نسخة حديثة)', '4 صور شخصية حديثة (3.5×4.5 سم، خلفية بيضاء)', 'شهادة السكنى أو عقد الكراء', 'شهادة الجنسية المغربية (إذا اقتضت الحاجة)'],
    notes: 'تُمنح بطاقة مؤقتة صالحة 3 أشهر. البطاقة الوطنية صالحة 10 سنوات.',
  },
  {
    id: 'cin-renew',
    titleAr: 'تجديد بطاقة التعريف الوطنية',
    titleFr: "Renouvellement de la CIN",
    category: 'cin', icon: '🔄', color: '#0891b2',
    duration: '10–20 يوم عمل', cost: 'مجاناً',
    where: 'مركز الشرطة أو الدرك المحلي', whereFr: 'Commissariat ou Brigade de Gendarmerie',
    description: 'تجديد بطاقة التعريف الوطنية عند انتهاء صلاحيتها أو فقدانها أو سرقتها أو تلفها.',
    steps: [
      { step: '1. الإعلان عن الفقدان أو السرقة (إن اقتضى الحال)', fr: 'Déclarer la perte ou le vol si nécessaire' },
      { step: '2. التوجه إلى مركز الشرطة أو الدرك', fr: 'Se rendre au commissariat local' },
      { step: '3. تقديم البطاقة المنتهية أو وصل التصريح بالفقدان', fr: "Présenter l'ancienne carte ou le récépissé de perte" },
      { step: '4. تقديم الملف الكامل وأخذ بيانات بيومترية جديدة', fr: 'Déposer le dossier et prise des nouvelles données biométriques' },
      { step: '5. استلام البطاقة الجديدة', fr: 'Retirer la nouvelle carte' },
    ],
    documents: ['البطاقة الوطنية المنتهية أو وصل التصريح بالفقدان', '4 صور شخصية حديثة', 'شهادة السكنى حديثة'],
    notes: 'في حالة الفقدان: يجب تقديم تصريح بالفقدان قبل طلب التجديد.',
  },
  {
    id: 'cin-minor',
    titleAr: 'بطاقة التعريف الوطنية للقاصر (16–17 سنة)',
    titleFr: 'CIN pour Mineur (16–17 ans)',
    category: 'cin', icon: '👦', color: '#0891b2',
    duration: '15–25 يوم', cost: 'مجاناً',
    where: 'مركز الشرطة أو الدرك', whereFr: 'Commissariat / Gendarmerie',
    description: 'استخراج بطاقة تعريف وطنية للقاصر الذي يبلغ 16 أو 17 سنة بمرافقة ولي أمره.',
    steps: [
      { step: '1. مرافقة ولي الأمر للقاصر', fr: 'Le mineur doit être accompagné du tuteur légal' },
      { step: '2. تقديم الملف الكامل والتوقيع من ولي الأمر', fr: 'Dépôt du dossier et signature du tuteur' },
      { step: '3. أخذ البيانات البيومترية للقاصر', fr: 'Prise des données biométriques du mineur' },
      { step: '4. استلام البطاقة', fr: 'Retrait de la carte' },
    ],
    documents: ['شهادة الميلاد كاملة للقاصر', 'بطاقة تعريف ولي الأمر', '4 صور شخصية للقاصر', 'شهادة السكنى'],
    notes: 'البطاقة الوطنية للقاصر صالحة 5 سنوات.',
  },
  {
    id: 'cin-lost-abroad',
    titleAr: 'تجديد البطاقة الوطنية في الخارج',
    titleFr: 'Renouvellement CIN à l\'Étranger',
    category: 'cin', icon: '🌍', color: '#0891b2',
    duration: '30–60 يوم', cost: 'مجاناً',
    where: 'القنصلية أو السفارة المغربية', whereFr: 'Consulat ou Ambassade du Maroc',
    description: 'تجديد بطاقة التعريف الوطنية من الخارج عبر القنصلية المغربية في بلد الإقامة.',
    steps: [
      { step: '1. التوجه إلى القنصلية المغربية في بلد الإقامة', fr: 'Se rendre au consulat marocain du pays de résidence' },
      { step: '2. تقديم الملف الكامل', fr: 'Déposer le dossier complet' },
      { step: '3. أخذ البيانات البيومترية', fr: 'Prise des données biométriques' },
      { step: '4. انتظار إرسال البطاقة عبر البريد أو الاستلام من القنصلية', fr: 'Attendre l\'envoi ou retrait au consulat' },
    ],
    documents: ['البطاقة الوطنية المنتهية أو الفائتة', 'جواز السفر المغربي', '4 صور شخصية', 'وثيقة إثبات الإقامة في الخارج'],
    notes: 'الخدمة متاحة أيضاً عبر البوابة الإلكترونية للمغاربة في الخارج.',
    online: 'marocainsdumonde.gov.ma',
  },

  /* ═══════════════════════════════════════════════
     2. PERMIS DE CONDUIRE & VÉHICULES
  ════════════════════════════════════════════════ */
  {
    id: 'permis-renew',
    titleAr: 'تجديد رخصة السياقة',
    titleFr: 'Renouvellement du Permis de Conduire',
    category: 'permis', icon: '🚗', color: '#7c3aed',
    duration: '5–15 يوم', cost: '200–500 درهم',
    where: 'المديرية الجهوية للنقل', whereFr: "Direction Régionale des Transports",
    description: 'تجديد رخصة السياقة عند انتهاء صلاحيتها أو في حالة الفقدان أو التلف.',
    steps: [
      { step: '1. اجتياز الفحص الطبي (عند الحاجة)', fr: 'Passer la visite médicale si requis' },
      { step: '2. تقديم الملف الكامل بالمديرية الجهوية للنقل', fr: 'Déposer le dossier à la DRT' },
      { step: '3. أداء الرسوم المطلوبة', fr: 'Payer les frais' },
      { step: '4. الحصول على وصل الإيداع وانتظار الرخصة', fr: 'Obtenir le reçu et attendre le permis' },
      { step: '5. استلام الرخصة المجددة', fr: 'Retirer le permis renouvelé' },
    ],
    documents: ['رخصة السياقة المنتهية أو الفائتة', 'بطاقة التعريف الوطنية', '4 صور شخصية', 'شهادة طبية من طبيب مختص', 'وصل أداء الرسوم'],
    notes: 'صالحة 10 سنوات لمن دون 60 سنة، و5 سنوات لمن تجاوز 60 سنة.',
  },
  {
    id: 'permis-new',
    titleAr: 'استخراج رخصة السياقة (أول مرة)',
    titleFr: 'Permis de Conduire — Première Demande',
    category: 'permis', icon: '🏎️', color: '#7c3aed',
    duration: 'متغير حسب التكوين', cost: '700–2500 درهم',
    where: 'مدرسة تعليم السياقة المعتمدة', whereFr: "Auto-école agréée + Direction du Transport",
    description: 'الحصول على رخصة السياقة بعد التدريب في مدرسة معتمدة واجتياز الاختبارات.',
    steps: [
      { step: '1. التسجيل في مدرسة تعليم السياقة المعتمدة', fr: "S'inscrire dans une auto-école agréée" },
      { step: '2. اجتياز امتحان قانون السير (Code)', fr: 'Passer le code de la route' },
      { step: '3. التدريب على القيادة مع مدرب معتمد', fr: 'Formation pratique avec moniteur' },
      { step: '4. اجتياز امتحان القيادة التطبيقي', fr: "Passer l'examen pratique de conduite" },
      { step: '5. إيداع الملف بمديرية النقل واستلام الرخصة', fr: 'Dépôt dossier + retrait permis' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادة طبية من طبيب معتمد', '4 صور شخصية', 'شهادة النجاح في الامتحانات', 'وصل أداء الرسوم'],
    notes: 'السن الأدنى: 18 سنة للفئة B. يمكن التدريب من سن 17 سنة برفقة الوالدين.',
  },
  {
    id: 'carte-grise',
    titleAr: 'استخراج أو تحويل البطاقة الرمادية',
    titleFr: 'Carte Grise — Immatriculation / Mutation',
    category: 'permis', icon: '🚙', color: '#7c3aed',
    duration: '5–10 أيام', cost: '200–800 درهم',
    where: 'المديرية الجهوية للنقل', whereFr: 'Direction Régionale des Transports',
    description: 'استخراج البطاقة الرمادية لسيارة جديدة أو تحويل الملكية عند البيع.',
    steps: [
      { step: '1. التوجه إلى مركز التسجيل بالمديرية الجهوية للنقل', fr: 'Se rendre au centre de la DRT' },
      { step: '2. تقديم وثيقة الشراء أو عقد البيع', fr: "Présenter la facture ou l'acte de vente" },
      { step: '3. إجراء فحص تقني إذا اقتضى الحال', fr: 'Passer le contrôle technique si nécessaire' },
      { step: '4. تقديم الملف الكامل ودفع الرسوم', fr: 'Déposer le dossier et payer les frais' },
      { step: '5. استلام البطاقة الرمادية', fr: 'Retrait de la carte grise' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'فاكتورة الشراء أو عقد البيع موثق', 'شهادة المطابقة من الصانع', 'وثيقة التأمين', 'وصل الأداء الجبائي'],
    notes: 'عند شراء سيارة مستعملة، يجب نقل الملكية لدى موثق أو مفوض قضائي.',
  },
  {
    id: 'controle-technique',
    titleAr: 'الفحص التقني للسيارة',
    titleFr: 'Contrôle Technique du Véhicule',
    category: 'permis', icon: '🔧', color: '#7c3aed',
    duration: 'نفس اليوم', cost: '200–350 درهم',
    where: 'مراكز الفحص التقني المعتمدة', whereFr: 'Centres de Contrôle Technique agréés',
    description: 'إجراء الفحص التقني الإلزامي للسيارة كل سنتين للسيارات الخصوصية.',
    law: 'المرسوم رقم 2.10.421 المتعلق بالفحص التقني للسيارات',
    steps: [
      { step: '1. التوجه إلى مركز فحص تقني معتمد', fr: 'Se rendre à un centre agréé' },
      { step: '2. تقديم البطاقة الرمادية ووثيقة التأمين', fr: 'Présenter la carte grise et l\'assurance' },
      { step: '3. إجراء الفحص الشامل للسيارة', fr: 'Passer le contrôle complet du véhicule' },
      { step: '4. الحصول على وثيقة الفحص التقني', fr: 'Obtenir le certificat de contrôle technique' },
    ],
    documents: ['البطاقة الرمادية', 'وثيقة التأمين', 'بطاقة التعريف الوطنية'],
    notes: 'الفحص التقني إلزامي كل سنتين للسيارات الخصوصية وكل سنة للنقل العمومي.',
  },
  {
    id: 'assurance-auto',
    titleAr: 'التأمين الإجباري على السيارة (RCA)',
    titleFr: 'Assurance Responsabilité Civile Auto (RCA)',
    category: 'permis', icon: '🛡️', color: '#7c3aed',
    duration: 'نفس اليوم', cost: '500–3000 درهم سنوياً',
    where: 'شركة تأمين معتمدة أو وكيل تأمين', whereFr: "Compagnie d'assurance agréée",
    description: 'الاشتراك في التأمين الإجباري على السيارة ضد الغير — مطلوب قانونياً لكل مركبة.',
    law: 'الظهير رقم 1.02.238 المتعلق بالتأمين الإجباري على السيارات',
    steps: [
      { step: '1. التوجه إلى وكالة تأمين معتمدة', fr: "Se rendre à une agence d'assurance agréée" },
      { step: '2. تقديم وثائق السيارة والمالك', fr: 'Présenter les documents du véhicule et du propriétaire' },
      { step: '3. اختيار نوع التأمين وأداء القسط', fr: "Choisir le type d'assurance et payer la prime" },
      { step: '4. الحصول على وثيقة التأمين والملصق', fr: 'Obtenir la police d\'assurance et la vignette' },
    ],
    documents: ['البطاقة الرمادية', 'بطاقة التعريف الوطنية', 'رخصة السياقة'],
    notes: 'السياقة بدون تأمين جريمة قانونية تستوجب الغرامة والحجز.',
  },

  /* ═══════════════════════════════════════════════
     3. PASSEPORT & VOYAGE
  ════════════════════════════════════════════════ */
  {
    id: 'passeport',
    titleAr: 'استخراج / تجديد جواز السفر',
    titleFr: 'Obtention / Renouvellement du Passeport',
    category: 'passeport', icon: '📕', color: '#059669',
    duration: '15–30 يوم', cost: '300 درهم',
    where: 'مديرية الشؤون القنصلية', whereFr: 'Direction des Affaires Consulaires',
    description: 'استخراج جواز سفر بيومتري جديد أو تجديد جواز منتهي الصلاحية للمواطنين المغاربة.',
    steps: [
      { step: '1. تجهيز الوثائق المطلوبة', fr: 'Préparer les documents nécessaires' },
      { step: '2. التوجه إلى المديرية الجهوية للشؤون القنصلية', fr: 'Se rendre à la Direction Régionale ou Consulat' },
      { step: '3. أداء رسوم الطابع الجبائي 300 درهم', fr: 'Payer les droits de timbre 300 MAD' },
      { step: '4. أخذ البيانات البيومترية', fr: 'Prise des données biométriques' },
      { step: '5. استلام الجواز', fr: 'Retrait du passeport' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادة الميلاد كاملة', '4 صور شخصية (4×4 سم)', 'الجواز القديم المنتهي (للتجديد)', 'وصل أداء الطابع الجبائي 300 درهم'],
    notes: 'جواز السفر المغربي صالح 10 سنوات للبالغين و5 سنوات للقاصرين.',
    online: 'passeport.ma',
  },
  {
    id: 'laissez-passer',
    titleAr: 'تصريح بالعبور — لَيسَيه باسيه',
    titleFr: 'Laissez-Passer — Titre de Voyage Provisoire',
    category: 'passeport', icon: '🛂', color: '#059669',
    duration: '24–72 ساعة', cost: '100 درهم',
    where: 'المديرية الجهوية للشؤون القنصلية أو القنصلية', whereFr: 'Direction Régionale / Consulat',
    description: 'وثيقة سفر مؤقتة للمواطنين الذين فقدوا جوازاتهم في الخارج أو في حالات الاستعجال.',
    steps: [
      { step: '1. التوجه إلى القنصلية أو المديرية القنصلية', fr: 'Se rendre au consulat compétent' },
      { step: '2. تقديم التصريح بالفقدان', fr: 'Présenter la déclaration de perte' },
      { step: '3. ملء استمارة الطلب وأداء الرسوم', fr: 'Remplir la demande et payer les frais' },
      { step: '4. استلام تصريح العبور', fr: 'Retrait du laissez-passer' },
    ],
    documents: ['بطاقة التعريف الوطنية أو نسخة منها', 'تصريح بالفقدان من الشرطة المحلية', 'تذكرة السفر', 'صورتان شخصيتان', '100 درهم رسوم'],
    notes: 'لايسيه باسيه صالح لرحلة واحدة فقط. لا يغني عن جواز السفر.',
  },
  {
    id: 'visa-schengen',
    titleAr: 'تأشيرة شنغن — وثائق الدعم',
    titleFr: 'Visa Schengen — Documents de Support',
    category: 'passeport', icon: '🇪🇺', color: '#059669',
    duration: '15–45 يوم (حسب السفارة)', cost: '80 يورو (رسوم السفارة)',
    where: 'سفارة أو قنصلية البلد المقصود', whereFr: 'Ambassade ou Consulat du pays destinataire',
    description: 'تجهيز ملف طلب تأشيرة شنغن للسفر إلى دول الاتحاد الأوروبي.',
    steps: [
      { step: '1. تحديد البلد المقصود وسفارته', fr: "Identifier le pays de destination et son ambassade" },
      { step: '2. حجز موعد لإيداع الطلب', fr: 'Prendre rendez-vous pour le dépôt' },
      { step: '3. تجهيز الملف الكامل', fr: 'Préparer le dossier complet' },
      { step: '4. إيداع الطلب وأداء الرسوم', fr: 'Déposer la demande et payer les frais' },
      { step: '5. انتظار الرد وتسلم جواز السفر', fr: 'Attendre la décision et retirer le passeport' },
    ],
    documents: ['جواز سفر ساري (6 أشهر على الأقل)', 'صور شخصية بمواصفات شنغن', 'تأمين سفر (30.000 يورو)', 'بيانات مصرفية (3 أشهر)', 'حجز الفندق والطيران', 'عقد العمل أو وثيقة مهنية', 'استمارة طلب التأشيرة مملوءة'],
    notes: 'يُنصح بتقديم الطلب 3 أشهر قبل السفر. رسوم التأشيرة غير قابلة للاسترداد.',
  },
  {
    id: 'visa-travail',
    titleAr: 'تأشيرة العمل في الخارج',
    titleFr: "Visa de Travail à l'Étranger",
    category: 'passeport', icon: '✈️', color: '#059669',
    duration: '1–6 أشهر', cost: 'متغيرة',
    where: 'سفارة البلد المقصود + ANAPEC', whereFr: 'Ambassade du pays + ANAPEC',
    description: 'إجراءات الحصول على تأشيرة عمل في الخارج عبر قنوات رسمية.',
    steps: [
      { step: '1. التسجيل في ANAPEC والبحث عن عرض عمل مصادق عليه', fr: "S'inscrire à l'ANAPEC et trouver une offre validée" },
      { step: '2. التعاقد مع صاحب العمل الأجنبي', fr: "Contracter avec l'employeur étranger" },
      { step: '3. المصادقة على العقد من وزارة الشغل', fr: 'Faire valider le contrat par le ministère du Travail' },
      { step: '4. التقدم بطلب التأشيرة', fr: 'Déposer la demande de visa' },
    ],
    documents: ['جواز سفر ساري', 'عقد العمل مصادق عليه', 'شهادات الكفاءة المهنية', 'شهادة عدم السوابق القضائية', 'الفحص الطبي'],
    notes: 'التحقق من مصداقية صاحب العمل قبل التوقيع. تجنب قنوات غير رسمية.',
  },

  /* ═══════════════════════════════════════════════
     4. ÉTAT CIVIL
  ════════════════════════════════════════════════ */
  {
    id: 'naissance',
    titleAr: 'تسجيل المولود وشهادة الميلاد',
    titleFr: 'Déclaration de Naissance — Acte de Naissance',
    category: 'etat-civil', icon: '👶', color: '#d97706',
    duration: '1–3 أيام', cost: 'مجاناً',
    where: 'مكتب الحالة المدنية — الجماعة المحلية', whereFr: "Bureau d'État Civil — Commune",
    description: 'التصريح بالولادة وتسجيل المولود في سجل الحالة المدنية خلال الأجل القانوني.',
    law: 'مدونة الأسرة — المواد 54–58',
    steps: [
      { step: '1. الحصول على شهادة الولادة من المستشفى', fr: "Obtenir le certificat d'accouchement de la maternité" },
      { step: '2. التوجه إلى مكتب الحالة المدنية خلال 30 يوماً', fr: "Se rendre au bureau d'état civil dans les 30 jours" },
      { step: '3. اختيار الاسم والتوقيع على التصريح', fr: 'Choisir le prénom et signer la déclaration' },
      { step: '4. استلام نسخة عقد الميلاد', fr: "Recevoir l'extrait de l'acte de naissance" },
    ],
    documents: ['شهادة الولادة من المستشفى أو القابلة', 'بطاقة تعريف الأب وشهادة الزواج', 'بطاقة تعريف الأم'],
    notes: 'الأجل القانوني: 30 يوماً. بعده يلزم حكم قضائي للتسجيل.',
  },
  {
    id: 'mariage',
    titleAr: 'توثيق عقد الزواج',
    titleFr: 'Acte de Mariage — Documentation',
    category: 'etat-civil', icon: '💒', color: '#be185d',
    duration: '1–7 أيام', cost: 'رسوم التوثيق (متغيرة)',
    where: 'المحكمة الابتدائية — قسم قضاء الأسرة', whereFr: "Tribunal de Première Instance — Section Famille",
    description: 'الحصول على رسمي عقد الزواج الموثق بالمحكمة بعد الزواج لدى عدلين.',
    law: 'مدونة الأسرة — المواد 4–24',
    steps: [
      { step: '1. إتمام مراسم الزواج أمام عدلين', fr: 'Célébration du mariage devant deux adouls' },
      { step: '2. تقديم وثيقة الزواج العدلي للمحكمة', fr: "Dépôt de l'acte de mariage adoulaire au tribunal" },
      { step: '3. دفع الرسوم القضائية وانتظار المصادقة', fr: 'Payer les frais et attendre la validation' },
      { step: '4. استلام رسمي عقد الزواج', fr: "Retirer l'acte de mariage officiel" },
    ],
    documents: ['وثيقة العقد العدلي', 'بطاقتا تعريف الزوجين', 'شهادة الميلاد للزوجين'],
    notes: 'يجب التصريح بالزواج في الحالة المدنية خلال 30 يوماً.',
  },
  {
    id: 'divorce',
    titleAr: 'تسجيل الطلاق في الحالة المدنية',
    titleFr: 'Enregistrement du Divorce',
    category: 'etat-civil', icon: '⚖️', color: '#be185d',
    duration: '3–7 أيام', cost: 'رسوم قضائية',
    where: 'المحكمة الابتدائية — قسم الأسرة', whereFr: "Tribunal de Première Instance",
    description: 'تسجيل حكم الطلاق في سجلات الحالة المدنية بعد صدور حكم قضائي نهائي.',
    steps: [
      { step: '1. الحصول على نسخة نهائية من حكم الطلاق', fr: 'Obtenir une copie définitive du jugement' },
      { step: '2. التوجه إلى كتابة الضبط لتنفيذ الحكم', fr: 'Se rendre au greffe pour exécution' },
      { step: '3. التسجيل في سجل الحالة المدنية', fr: "Enregistrement dans le registre d'état civil" },
    ],
    documents: ['نسخة رسمية من حكم الطلاق', 'بطاقة التعريف الوطنية', 'عقد الزواج الأصلي'],
    notes: 'يجب تسجيل الطلاق خلال 30 يوماً من صدور الحكم.',
  },
  {
    id: 'deces',
    titleAr: 'التصريح بالوفاة واستخراج رسمي الوفاة',
    titleFr: 'Déclaration de Décès — Acte de Décès',
    category: 'etat-civil', icon: '🕊️', color: '#475569',
    duration: '1–2 أيام', cost: 'مجاناً',
    where: 'مكتب الحالة المدنية', whereFr: "Bureau d'État Civil",
    description: 'التصريح بالوفاة وتسجيلها في سجلات الحالة المدنية للحصول على رسمي الوفاة.',
    steps: [
      { step: '1. الحصول على شهادة الوفاة من المستشفى أو الطبيب', fr: 'Obtenir le certificat médical de décès' },
      { step: '2. التوجه إلى مكتب الحالة المدنية خلال 30 يوماً', fr: 'Se rendre au bureau dans les 30 jours' },
      { step: '3. ملء استمارة التصريح بالوفاة واستلام رسمي الوفاة', fr: "Remplir la déclaration et retirer l'acte" },
    ],
    documents: ['شهادة الوفاة الطبية', 'بطاقة تعريف المتوفى', 'بطاقة تعريف المُصرِّح'],
    notes: 'رسمي الوفاة مطلوب في إجراءات الإرث وإلغاء الوثائق الرسمية للمتوفى.',
  },
  {
    id: 'acte-naissance-copie',
    titleAr: 'استخراج نسخة من عقد الازدياد',
    titleFr: 'Copie Intégrale de l\'Acte de Naissance',
    category: 'etat-civil', icon: '📄', color: '#d97706',
    duration: 'نفس اليوم — 2 يوم', cost: 'طابع جبائي 20 درهم',
    where: 'الجماعة المحلية أو المحكمة الابتدائية', whereFr: 'Commune ou Tribunal',
    description: 'استخراج نسخة كاملة أو مستخرج من عقد الازدياد للاستخدام في الإجراءات الإدارية.',
    steps: [
      { step: '1. التوجه إلى مكتب الحالة المدنية بالجماعة', fr: "Se rendre au bureau d'état civil" },
      { step: '2. تقديم بطاقة التعريف وتحديد السنة والتسلسل', fr: 'Présenter la CIN et préciser les références' },
      { step: '3. أداء الطابع الجبائي واستلام النسخة', fr: 'Payer le timbre et retirer la copie' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'طابع جبائي 20 درهم'],
    notes: 'في حال عدم توفر البيانات محلياً، يمكن طلبها من جماعة الميلاد الأصلية.',
    online: 'cni.gov.ma',
  },

  /* ═══════════════════════════════════════════════
     5. COMMUNE & ARRONDISSEMENT
  ════════════════════════════════════════════════ */
  {
    id: 'residence',
    titleAr: 'شهادة السكنى / الإقامة',
    titleFr: "Certificat de Résidence",
    category: 'commune', icon: '🏘️', color: '#0f766e',
    duration: '1–3 أيام', cost: 'طابع جبائي 20 درهم',
    where: 'مقاطعة الحي أو الجماعة المحلية', whereFr: 'Arrondissement / Commune',
    description: 'شهادة رسمية تُثبت محل إقامة المواطن، مطلوبة في معظم الإجراءات الإدارية.',
    steps: [
      { step: '1. التوجه إلى مقاطعة الحي', fr: "Se rendre à l'arrondissement" },
      { step: '2. تقديم بطاقة التعريف وعقد الكراء أو وثيقة التملك', fr: 'Présenter la CIN et justificatif de domicile' },
      { step: '3. ملء استمارة الطلب وأداء الطابع الجبائي', fr: 'Remplir le formulaire et payer le timbre' },
      { step: '4. انتظار التحقق الميداني واستلام الشهادة', fr: 'Attendre la vérification et retirer le certificat' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'عقد الكراء أو وثيقة التملك أو فاتورة كهرباء/ماء', 'طابع جبائي 20 درهم'],
    notes: 'صالحة 3 أشهر من تاريخ إصدارها.',
    online: 'podar.ma',
  },
  {
    id: 'attestation-vie',
    titleAr: 'شهادة الحياة',
    titleFr: 'Certificat de Vie',
    category: 'commune', icon: '💚', color: '#0f766e',
    duration: 'نفس اليوم', cost: 'طابع جبائي 20 درهم',
    where: 'الجماعة المحلية أو مقاطعة الحي', whereFr: 'Commune / Arrondissement',
    description: 'وثيقة إدارية تُثبت أن الشخص المعني على قيد الحياة، مطلوبة للمعاشات والتأمينات.',
    steps: [
      { step: '1. الحضور الشخصي إلى مكتب الجماعة', fr: 'Se présenter en personne à la commune' },
      { step: '2. تقديم بطاقة التعريف وأداء الطابع الجبائي', fr: 'Présenter la CIN et payer le timbre' },
      { step: '3. استلام شهادة الحياة', fr: 'Retrait du certificat de vie' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'طابع جبائي 20 درهم'],
    notes: 'مطلوبة سنوياً من صناديق التقاعد (CNSS، CMR).',
  },
  {
    id: 'legalization',
    titleAr: 'المصادقة على الإمضاء',
    titleFr: 'Légalisation de Signature',
    category: 'commune', icon: '✍️', color: '#0f766e',
    duration: 'نفس اليوم', cost: 'طابع جبائي 20 درهم',
    where: 'المقاطعة أو الجماعة المحلية', whereFr: 'Arrondissement / Commune',
    description: 'المصادقة على توقيع الشخص من قِبل الجماعة، مطلوبة في وثائق إدارية وقانونية عديدة.',
    steps: [
      { step: '1. الحضور الشخصي بالجماعة أو المقاطعة', fr: 'Se présenter en personne à la commune' },
      { step: '2. تقديم الوثيقة والتوقيع أمام الموظف المختص', fr: 'Présenter le document et signer devant le fonctionnaire' },
      { step: '3. أداء الطابع الجبائي وختم الوثيقة', fr: 'Payer le timbre et apposer le cachet' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'الوثيقة المراد المصادقة عليها', 'طابع جبائي 20 درهم'],
    notes: 'يجب الحضور الشخصي للتوقيع. لا يمكن التوكيل.',
  },
  {
    id: 'conformite',
    titleAr: 'شهادة مطابقة النسخة للأصل',
    titleFr: 'Certification de Conformité — Copie Conforme',
    category: 'commune', icon: '📋', color: '#0f766e',
    duration: 'نفس اليوم', cost: 'طابع جبائي 20 درهم للصفحة',
    where: 'الجماعة أو المقاطعة المحلية', whereFr: 'Commune / Arrondissement',
    description: 'المصادقة على نسخة من وثيقة بأنها مطابقة للأصل للاستخدام في الإجراءات الرسمية.',
    steps: [
      { step: '1. إحضار الوثيقة الأصلية ونسخها', fr: "Apporter l'original et ses photocopies" },
      { step: '2. تقديم البطاقة الوطنية للمُقدِّم', fr: 'Présenter la CIN' },
      { step: '3. ختم كل صفحة وأداء الطابع الجبائي', fr: 'Tamponner chaque page et payer le timbre' },
    ],
    documents: ['الوثيقة الأصلية', 'نسخ فوتوغرافية', 'بطاقة التعريف الوطنية', 'طابع جبائي 20 درهم لكل صفحة'],
    notes: 'تُستعمل النسخ المطابقة في المناقصات والطلبات الرسمية.',
  },
  {
    id: 'attestation-commune',
    titleAr: 'شهادة إدارية جماعية متعددة الأغراض',
    titleFr: 'Attestation Administrative Communale',
    category: 'commune', icon: '📃', color: '#0f766e',
    duration: '1–5 أيام', cost: 'طابع جبائي 20 درهم',
    where: 'الجماعة المحلية أو المقاطعة', whereFr: 'Commune / Arrondissement',
    description: 'استخراج شهادات إدارية متعددة: عزوبية، طلاق، إقامة مزدوجة، إلخ.',
    steps: [
      { step: '1. تحديد نوع الشهادة المطلوبة', fr: 'Identifier le type d\'attestation requise' },
      { step: '2. التوجه إلى مكتب الجماعة بالوثائق المناسبة', fr: 'Se rendre à la commune avec les documents adéquats' },
      { step: '3. ملء الاستمارة وأداء الطابع الجبائي', fr: 'Remplir le formulaire et payer le timbre' },
      { step: '4. استلام الشهادة المطلوبة', fr: 'Retirer l\'attestation demandée' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'وثائق داعمة حسب نوع الشهادة', 'طابع جبائي 20 درهم'],
    notes: 'أنواع الشهادات تشمل: العزوبية، الإقامة المنفردة، السلوك الحسن، إلخ.',
  },

  /* ═══════════════════════════════════════════════
     6. COMMERCE & ENTREPRISE
  ════════════════════════════════════════════════ */
  {
    id: 'registre-commerce',
    titleAr: 'التسجيل في السجل التجاري',
    titleFr: 'Inscription au Registre de Commerce (RC)',
    category: 'commerce', icon: '🏪', color: '#1d4ed8',
    duration: '3–7 أيام', cost: '150–500 درهم',
    where: 'المحكمة التجارية — كتابة الضبط', whereFr: 'Tribunal de Commerce — Greffe',
    description: 'تسجيل النشاط التجاري في السجل التجاري بالمحكمة التجارية المختصة.',
    law: 'القانون رقم 15-95 المتعلق بمدونة التجارة',
    steps: [
      { step: '1. تحديد الشكل القانوني (تاجر منفرد / شركة)', fr: 'Définir la forme juridique (individuel / société)' },
      { step: '2. إيداع طلب التسجيل بكتابة الضبط', fr: 'Déposer la demande au greffe du tribunal' },
      { step: '3. التسجيل الضريبي (IF/TVA)', fr: "S'inscrire fiscalement" },
      { step: '4. الحصول على رقم السجل التجاري', fr: 'Obtenir le numéro RC' },
    ],
    documents: ['بطاقة التعريف الوطنية للمسير', 'عقد الإيجار أو وثيقة المحل التجاري', 'النظام الأساسي للشركة (للشركات)', 'استمارة طلب التسجيل', 'وصل الأداء'],
    notes: 'يمكن التسجيل عبر المركز الجهوي للاستثمار (CRI) أو إلكترونياً.',
    online: 'registre-commerce.ma',
  },
  {
    id: 'auto-entrepreneur',
    titleAr: 'نظام المقاول الذاتي (Auto-Entrepreneur)',
    titleFr: "Régime Auto-Entrepreneur",
    category: 'commerce', icon: '🧑‍💼', color: '#1d4ed8',
    duration: '1–3 أيام', cost: 'مجاناً',
    where: 'المركز الجهوي للاستثمار أو عبر الإنترنت', whereFr: 'CRI ou en ligne',
    description: 'التسجيل في نظام المقاول الذاتي للأشخاص الذين يمارسون نشاطاً فردياً بإجراءات مبسطة.',
    law: 'القانون رقم 114-13 المتعلق بنظام المقاول الذاتي',
    steps: [
      { step: '1. التسجيل عبر منصة autoentrepreneur.ma أو CRI', fr: 'S\'inscrire sur autoentrepreneur.ma ou au CRI' },
      { step: '2. اختيار النشاط المهني', fr: 'Choisir l\'activité professionnelle' },
      { step: '3. الحصول على رقم التعريف الجبائي وبطاقة المقاول الذاتي', fr: 'Obtenir le numéro fiscal et la carte d\'auto-entrepreneur' },
      { step: '4. الالتزام بالتصريح الفصلي أو السنوي بالدخل', fr: 'S\'acquitter des déclarations trimestrielles/annuelles' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'عنوان المحل أو مقر النشاط (اختياري)'],
    notes: 'الحد الأقصى للرقم المعاملاتي: 500.000 درهم للتجارة و200.000 درهم للخدمات.',
    online: 'autoentrepreneur.ma',
  },
  {
    id: 'patente',
    titleAr: 'التسجيل في الضريبة المهنية',
    titleFr: 'Taxe Professionnelle (ex-Patente)',
    category: 'commerce', icon: '🧾', color: '#1d4ed8',
    duration: '5–10 أيام', cost: 'متغيرة حسب النشاط',
    where: 'المديرية الجهوية للضرائب', whereFr: 'Direction Régionale des Impôts',
    description: 'التسجيل في الضريبة المهنية للحصول على بطاقة المهنة والتسجيل الضريبي.',
    steps: [
      { step: '1. التوجه إلى مكتب الضرائب المختص', fr: 'Se rendre au bureau des impôts compétent' },
      { step: '2. تقديم ملف التسجيل الضريبي', fr: "Déposer le dossier d'inscription fiscale" },
      { step: '3. الحصول على رقم التعريف الضريبي (IF)', fr: 'Obtenir le numéro IF' },
      { step: '4. أداء الضريبة المهنية وأخذ البطاقة', fr: 'Payer et obtenir la carte professionnelle' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'السجل التجاري أو التصريح بالنشاط', 'عقد الإيجار', 'وصل الأداء'],
    notes: 'تُحسب على أساس الإيجار أو القيمة التجارية للمحل.',
  },
  {
    id: 'cnss-affiliation',
    titleAr: 'التسجيل في الصندوق الوطني للضمان الاجتماعي',
    titleFr: 'Affiliation CNSS — Employeur',
    category: 'commerce', icon: '🏢', color: '#1d4ed8',
    duration: '3–7 أيام', cost: 'مجاناً',
    where: 'وكالة الصندوق الوطني للضمان الاجتماعي', whereFr: 'Agence CNSS',
    description: 'تسجيل المقاولة في CNSS والتصريح بالأجراء لضمان حقوقهم الاجتماعية.',
    steps: [
      { step: '1. التوجه إلى وكالة CNSS المختصة', fr: "Se rendre à l'agence CNSS" },
      { step: '2. ملء استمارة الانخراط كصاحب عمل', fr: "Remplir le formulaire d'affiliation employeur" },
      { step: '3. تقديم وثائق المقاولة والحصول على رقم الانخراط', fr: "Fournir les documents et obtenir le numéro d'affiliation" },
      { step: '4. التصريح بالأجراء شهرياً', fr: 'Déclarer les salariés mensuellement' },
    ],
    documents: ['السجل التجاري', 'بطاقة التعريف الوطنية للمسير', 'النظام الأساسي للشركة', 'عقود الأجراء'],
    notes: 'الاشتراكات بنسبة 26.96% من الأجر الإجمالي.',
    online: 'cnss.ma',
  },
  {
    id: 'ice-numero',
    titleAr: 'الحصول على رقم ICE (المعرف المشترك للمقاولات)',
    titleFr: 'Obtention du Numéro ICE',
    category: 'commerce', icon: '🔢', color: '#1d4ed8',
    duration: '1–3 أيام', cost: 'مجاناً',
    where: 'مديرية الضرائب — عبر الإنترنت', whereFr: 'Direction des Impôts / En ligne',
    description: 'الحصول على رقم المعرف المشترك للمقاولات (ICE) الإلزامي في الفواتير والوثائق التجارية.',
    law: 'القانون رقم 47-06 المتعلق بجبايات الجماعات المحلية',
    steps: [
      { step: '1. التسجيل أو التوجه إلى مديرية الضرائب', fr: 'S\'inscrire ou se rendre à la Direction des Impôts' },
      { step: '2. تقديم السجل التجاري والوثائق الضريبية', fr: 'Fournir le RC et les documents fiscaux' },
      { step: '3. الحصول على رقم ICE المكون من 15 رقماً', fr: 'Obtenir le numéro ICE de 15 chiffres' },
    ],
    documents: ['السجل التجاري', 'رقم التعريف الجبائي (IF)', 'بطاقة التعريف الوطنية'],
    notes: 'رقم ICE إلزامي في كل الفواتير الصادرة منذ 2013.',
    online: 'ice.gov.ma',
  },

  /* ═══════════════════════════════════════════════
     7. PROTECTION SOCIALE
  ════════════════════════════════════════════════ */
  {
    id: 'aide-sociale',
    titleAr: 'التسجيل في الدعم الاجتماعي المباشر',
    titleFr: 'Inscription Aide Sociale Directe',
    category: 'sociale', icon: '🤝', color: '#15803d',
    duration: '15–45 يوم', cost: 'مجاناً',
    where: 'القيادة أو المقاطعة أو الجماعة', whereFr: 'Caïdat / Commune / Arrondissement',
    description: 'التسجيل في برامج الدعم الاجتماعي المباشر الحكومية (تيسير، أوراش، دعم الأسرة).',
    steps: [
      { step: '1. التوجه إلى مكتب المقاطعة أو الجماعة', fr: 'Se rendre à la commune ou arrondissement' },
      { step: '2. طلب استمارة التسجيل في البرنامج المناسب', fr: "Demander le formulaire d'inscription" },
      { step: '3. المرور بمرحلة الاستهداف الاجتماعي', fr: "Passer par l'étape de ciblage social" },
      { step: '4. انتظار الإشعار بالقبول والبدء في صرف المنحة', fr: "Attendre la notification d'acceptation" },
    ],
    documents: ['بطاقة التعريف الوطنية', 'دفتر الحالة المدنية', 'شهادات الميلاد للأطفال', 'وثيقة إثبات السكن'],
    notes: 'يشترط عدم التوفر على دخل منتظم.',
    online: 'tayssir.gov.ma',
  },
  {
    id: 'amo',
    titleAr: 'التأمين الإجباري عن المرض (AMO)',
    titleFr: "Assurance Maladie Obligatoire (AMO)",
    category: 'sociale', icon: '🏥', color: '#15803d',
    duration: '7–15 يوم', cost: 'اشتراك شهري حسب الدخل',
    where: 'CNSS أو CNOPS حسب القطاع', whereFr: 'CNSS (privé) / CNOPS (public)',
    description: 'التسجيل في نظام التأمين الإجباري عن المرض للاستفادة من تغطية صحية شاملة.',
    steps: [
      { step: '1. التوجه إلى وكالة CNSS أو CNOPS', fr: 'Se rendre à la CNSS ou CNOPS' },
      { step: '2. تقديم طلب الانخراط والوثائق', fr: "Déposer la demande d'affiliation" },
      { step: '3. الحصول على بطاقة الانخراط وتسجيل المستفيدين', fr: "Recevoir la carte et enregistrer les ayants droit" },
    ],
    documents: ['بطاقة التعريف الوطنية', 'عقد العمل أو شهادة العمل', 'عقد الزواج', 'شهادات ميلاد الأطفال'],
    notes: 'AMO TADAMON متاحة لغير العاملين. التسجيل عبر: cnss.ma',
    online: 'cnss.ma',
  },
  {
    id: 'ramed',
    titleAr: 'نظام المساعدة الطبية (RAMED)',
    titleFr: "Régime d'Assistance Médicale (RAMED)",
    category: 'sociale', icon: '💊', color: '#15803d',
    duration: '15–30 يوم', cost: 'مجاناً أو رمزي',
    where: 'القيادة أو الجماعة المحلية', whereFr: 'Caïdat / Commune / ANAM',
    description: 'التسجيل في نظام RAMED للحصول على تغطية صحية للأسر الفقيرة والهشة.',
    steps: [
      { step: '1. التوجه إلى مكتب القيادة أو الجماعة', fr: 'Se rendre au caïdat ou à la commune' },
      { step: '2. ملء استمارة طلب RAMED وتقييم الوضع الاجتماعي', fr: 'Remplir la demande RAMED et évaluation sociale' },
      { step: '3. الحصول على بطاقة RAMED', fr: 'Obtenir la carte RAMED' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادة السكنى', 'دفتر الحالة المدنية', 'وثيقة تثبت الوضع الاجتماعي'],
    notes: 'يوفر رعاية صحية في المستشفيات العمومية. يُجدَّد كل سنتين.',
  },
  {
    id: 'retraite',
    titleAr: 'إجراءات التقاعد والاستفادة من المعاش',
    titleFr: 'Départ à la Retraite — Pension',
    category: 'sociale', icon: '🧓', color: '#dc2626',
    duration: '1–3 أشهر', cost: 'مجاناً',
    where: 'CNSS أو CMR', whereFr: 'CNSS / Caisse Marocaine des Retraites (CMR)',
    description: 'إجراءات الاستفادة من معاش التقاعد عند بلوغ السن القانونية.',
    law: 'القانون رقم 17-99 المتعلق بمدونة التأمينات',
    steps: [
      { step: '1. تقديم طلب التقاعد الرسمي قبل 3 أشهر', fr: 'Déposer la demande officielle 3 mois avant' },
      { step: '2. إيداع الملف بالصندوق المختص', fr: 'Déposer le dossier à la caisse compétente' },
      { step: '3. التحقق من سنوات الخدمة والاشتراكات', fr: "Vérification des années de cotisation" },
      { step: '4. استلام قرار التقاعد وبداية صرف المعاش', fr: 'Recevoir la décision et début de la pension' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادة الميلاد', 'كشف سنوات الخدمة', 'آخر راتب', 'رقم الحساب البنكي'],
    notes: 'السن القانونية: 60 سنة في القطاع الخاص، 63 في العام.',
  },
  {
    id: 'pension-handicap',
    titleAr: 'منحة الإعاقة والحماية الاجتماعية',
    titleFr: 'Allocation Handicap — Protection Sociale',
    category: 'sociale', icon: '♿', color: '#15803d',
    duration: '30–90 يوم', cost: 'مجاناً',
    where: 'وكالة التنمية الاجتماعية — وزارة الأسرة', whereFr: 'Agence de Développement Social / Ministère de la Famille',
    description: 'التسجيل للاستفادة من منح وخدمات الحماية الاجتماعية للأشخاص ذوي الإعاقة.',
    law: 'القانون رقم 13-16 المتعلق بحماية الأشخاص ذوي الإعاقة',
    steps: [
      { step: '1. الحصول على شهادة الإعاقة من لجنة طبية معتمدة', fr: "Obtenir un certificat d'invalidité d'une commission médicale" },
      { step: '2. التوجه إلى وكالة التنمية الاجتماعية أو المقاطعة', fr: 'Se rendre à l\'agence de développement social' },
      { step: '3. تقديم ملف التسجيل وانتظار الموافقة', fr: 'Déposer le dossier et attendre l\'accord' },
      { step: '4. الاستفادة من المنح والخدمات', fr: 'Bénéficier des allocations et services' },
    ],
    documents: ['شهادة الإعاقة الطبية', 'بطاقة التعريف الوطنية', 'شهادة السكنى', 'صور شخصية'],
    notes: 'تشمل المزايا: النقل المجاني، تخفيض الضرائب، أولوية في الخدمات العمومية.',
  },

  /* ═══════════════════════════════════════════════
     8. JUSTICE & JURIDIQUE
  ════════════════════════════════════════════════ */
  {
    id: 'casier',
    titleAr: 'استخراج مستخرج السجل العدلي',
    titleFr: 'Extrait du Casier Judiciaire (Bulletin n°3)',
    category: 'justice', icon: '📜', color: '#475569',
    duration: '1–5 أيام', cost: 'طابع جبائي 20 درهم',
    where: 'كتابة الضبط بالمحكمة الابتدائية', whereFr: 'Greffe du Tribunal de Première Instance',
    description: 'الحصول على مستخرج السجل العدلي (البيان رقم 3) المطلوب للوظائف والإجراءات الإدارية.',
    steps: [
      { step: '1. التوجه إلى كتابة الضبط بالمحكمة الابتدائية لمحل الميلاد', fr: 'Se rendre au greffe du tribunal du lieu de naissance' },
      { step: '2. تقديم البطاقة الوطنية وشهادة الميلاد', fr: "Présenter la CIN et l'acte de naissance" },
      { step: '3. أداء الطابع الجبائي 20 درهم واستلام المستخرج', fr: 'Payer le timbre et retirer l\'extrait' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادة الميلاد', 'طابع جبائي 20 درهم'],
    notes: 'يمكن تقديم الطلب إلكترونياً. صالح 3 أشهر.',
    online: 'casier.justice.gov.ma',
  },
  {
    id: 'procuration',
    titleAr: 'توكيل رسمي لدى موثق',
    titleFr: 'Procuration Légale — Pouvoir Notarié',
    category: 'justice', icon: '🤝', color: '#475569',
    duration: '1–3 أيام', cost: 'رسوم التوثيق متغيرة',
    where: 'مكتب موثق معتمد', whereFr: "Office Notarial agréé",
    description: 'إعداد توكيل رسمي يُمكِّن شخصاً آخر من القيام بإجراءات نيابةً عن الموكِّل.',
    steps: [
      { step: '1. الاتصال بمكتب موثق معتمد', fr: "Contacter un notaire agréé" },
      { step: '2. تحديد صلاحيات التوكيل بدقة (عام أو خاص)', fr: 'Définir précisément les pouvoirs (général ou spécial)' },
      { step: '3. التوقيع على وثيقة التوكيل أمام الموثق', fr: 'Signer la procuration devant le notaire' },
      { step: '4. المصادقة على التوقيع بالجماعة إن لزم', fr: 'Légaliser la signature si nécessaire' },
    ],
    documents: ['بطاقة التعريف الوطنية للموكِّل والوكيل', 'تحديد طبيعة التوكيل'],
    notes: 'التوكيل الخاص لعملية بعينها. التوكيل العام يُفوِّض جميع الصلاحيات.',
  },
  {
    id: 'heritage',
    titleAr: 'إجراءات الإرث والتركة',
    titleFr: "Procédures de Succession et d'Héritage",
    category: 'justice', icon: '🏠', color: '#475569',
    duration: '1–12 شهر', cost: 'رسوم تسجيل + ضريبة التركة',
    where: 'المحكمة الابتدائية + الموثق', whereFr: "Tribunal + Notaire + Conservation Foncière",
    description: 'إجراءات تصفية التركة وتوزيع الإرث على الورثة بالطريقة القانونية.',
    steps: [
      { step: '1. الحصول على رسمي الوفاة وحصر الورثة من المحكمة', fr: "Obtenir l'acte de décès et l'acte de dévolution" },
      { step: '2. حصر أصول التركة (عقارات، حسابات، منقولات)', fr: 'Inventorier les actifs de la succession' },
      { step: '3. الحصول على شهادة الإرث وتصفية الديون', fr: "Obtenir l'acte d'héritage et régler les dettes" },
      { step: '4. نقل الملكية العقارية بالمحافظة العقارية', fr: 'Transfert de propriété à la Conservation Foncière' },
    ],
    documents: ['رسمي الوفاة', 'وثيقة حصر الورثة', 'بطاقات التعريف للورثة', 'رسوم العقارات والأملاك'],
    notes: 'يُنصح بالاستعانة بمحامٍ أو موثق متخصص في قضايا الإرث.',
  },
  {
    id: 'recours-administratif',
    titleAr: 'الطعن والتظلم الإداري',
    titleFr: 'Recours Administratif — Contestation',
    category: 'justice', icon: '⚖️', color: '#475569',
    duration: '30–180 يوم', cost: 'رسوم قضائية',
    where: 'المحكمة الإدارية أو محكمة الاستئناف الإدارية', whereFr: "Tribunal Administratif / Cour d'Appel Administrative",
    description: 'تقديم طعن أو تظلم إداري ضد قرار إداري غير قانوني.',
    law: 'القانون رقم 41-90 المحدث للمحاكم الإدارية',
    steps: [
      { step: '1. الاستعانة بمحامٍ متخصص في القضايا الإدارية', fr: 'Engager un avocat spécialisé en droit administratif' },
      { step: '2. تجهيز ملف الطعن والوثائق الداعمة', fr: 'Préparer le dossier de recours et les justificatifs' },
      { step: '3. إيداع الطعن لدى كتابة ضبط المحكمة الإدارية', fr: 'Déposer le recours au greffe du tribunal administratif' },
      { step: '4. المثول في الجلسات وانتظار الحكم', fr: 'Comparaître aux audiences et attendre le jugement' },
    ],
    documents: ['الوثيقة الإدارية المطعون فيها', 'بطاقة التعريف الوطنية', 'وكالة المحامي', 'وصل أداء الرسوم القضائية'],
    notes: 'أجل الطعن: 60 يوماً من تاريخ التبليغ بالقرار الإداري.',
  },

  /* ═══════════════════════════════════════════════
     9. ÉDUCATION & FORMATION
  ════════════════════════════════════════════════ */
  {
    id: 'inscription-scolaire',
    titleAr: 'التسجيل المدرسي للموسم الجديد',
    titleFr: 'Inscription Scolaire — Rentrée',
    category: 'education', icon: '📚', color: '#b45309',
    duration: '1–3 أيام', cost: 'مجاناً للتعليم العمومي',
    where: 'المدرسة أو الثانوية الإعدادية/التأهيلية', whereFr: 'École / Collège / Lycée',
    description: 'التسجيل في المؤسسة التعليمية للموسم الدراسي الجديد.',
    steps: [
      { step: '1. التحقق من التوجيه والمؤسسة المخصصة', fr: "Vérifier l'orientation et l'établissement" },
      { step: '2. التوجه إلى المؤسسة بالوثائق وتعبئة الاستمارة', fr: 'Se rendre à l\'établissement et remplir le formulaire' },
      { step: '3. الحصول على وصل التسجيل', fr: "Obtenir le reçu d'inscription" },
    ],
    documents: ['شهادة الميلاد', 'بطاقة تعريف الأبوين', 'شهادة النجاح للسنة السابقة', 'صورتان شخصيتان', 'شهادة التطعيم (للابتدائي)'],
    notes: 'التسجيل الإلكتروني متاح عبر: taalim.ma',
    online: 'taalim.ma',
  },
  {
    id: 'bac',
    titleAr: 'التسجيل في امتحانات البكالوريا',
    titleFr: 'Inscription au Baccalauréat',
    category: 'education', icon: '🎓', color: '#b45309',
    duration: '3–5 أيام', cost: 'مجاناً',
    where: 'مديرية التربية والتعليم الإقليمية', whereFr: "Direction Provinciale de l'Enseignement",
    description: 'التسجيل في امتحانات البكالوريا النظامية أو كمرشح حر.',
    steps: [
      { step: '1. التسجيل عبر المنصة الإلكترونية أو المديرية الإقليمية', fr: "S'inscrire via la plateforme ou la direction provinciale" },
      { step: '2. تقديم الوثائق المطلوبة', fr: 'Fournir les documents requis' },
      { step: '3. الحصول على استدعاء الامتحان', fr: 'Obtenir la convocation aux examens' },
    ],
    documents: ['البطاقة الوطنية', 'استمارة التسجيل', '2 صور شخصية', 'شهادات دراسية (للمرشح الحر)'],
    notes: 'المرشح الحر يجب أن يكون منقطعاً عن الدراسة منذ سنتين على الأقل.',
    online: 'bac.men.gov.ma',
  },
  {
    id: 'universite',
    titleAr: 'التسجيل بالجامعة',
    titleFr: 'Inscription Universitaire',
    category: 'education', icon: '🏫', color: '#b45309',
    duration: '5–15 يوم', cost: '200–600 درهم',
    where: 'الكلية أو المدرسة العليا', whereFr: 'Faculté / École Supérieure',
    description: 'التسجيل في الجامعة للسنة الأولى أو إعادة التسجيل للسنوات الموالية.',
    steps: [
      { step: '1. التسجيل المسبق عبر منصة ONOUSC', fr: 'Pré-inscription via la plateforme ONOUSC' },
      { step: '2. انتظار تأكيد التسجيل والشعبة', fr: "Attendre la confirmation d'inscription" },
      { step: '3. التوجه للكلية بالوثائق ودفع الرسوم', fr: "Se rendre à la faculté et payer les frais d'inscription" },
      { step: '4. الحصول على بطاقة الطالب', fr: "Obtenir la carte d'étudiant" },
    ],
    documents: ['شهادة البكالوريا الأصلية وصورة', 'البطاقة الوطنية', '4 صور شخصية', 'شهادة الميلاد', 'وصل أداء رسوم التسجيل'],
    notes: 'المسالك المنظمة (الطب، الهندسة) تتطلب مباراة الولوج.',
    online: 'onousc.ma',
  },
  {
    id: 'equivalence',
    titleAr: 'المعادلة الدراسية للشهادات الأجنبية',
    titleFr: 'Équivalence de Diplômes Étrangers',
    category: 'education', icon: '🎓', color: '#b45309',
    duration: '30–90 يوم', cost: 'رسوم إدارية',
    where: 'وزارة التربية الوطنية والتعليم العالي', whereFr: 'Ministère de l\'Éducation et Enseignement Supérieur',
    description: 'الحصول على معادلة رسمية للشهادة الأجنبية من الوزارة المغربية.',
    steps: [
      { step: '1. إيداع ملف المعادلة بوزارة التعليم العالي', fr: 'Déposer le dossier d\'équivalence au Ministère' },
      { step: '2. تقديم الشهادة الأصلية مترجمة ومصادق عليها', fr: 'Fournir le diplôme original traduit et certifié' },
      { step: '3. دراسة الملف من قبل اللجنة التقنية', fr: 'Examen du dossier par la commission technique' },
      { step: '4. استلام قرار المعادلة', fr: "Retirer la décision d'équivalence" },
    ],
    documents: ['الشهادة الأصلية + ترجمة معتمدة', 'كشف النقط الكامل', 'بطاقة التعريف الوطنية أو جواز السفر', 'استمارة الطلب مملوءة'],
    notes: 'الشهادات من بعض الدول لا تُعادل تلقائياً. مدة المعالجة قد تمتد لـ6 أشهر.',
    online: 'men.gov.ma',
  },
  {
    id: 'formation-professionnelle',
    titleAr: 'التسجيل في مراكز التكوين المهني',
    titleFr: 'Inscription Formation Professionnelle (OFPPT)',
    category: 'education', icon: '🔧', color: '#b45309',
    duration: '3–10 أيام (حسب المباراة)', cost: 'مجاناً للمراكز العمومية',
    where: 'مراكز التكوين المهني — OFPPT', whereFr: 'Centres OFPPT',
    description: 'التسجيل في مركز التكوين المهني (OFPPT) للحصول على تأهيل مهني معتمد.',
    steps: [
      { step: '1. اختيار التخصص والمركز الجهوي المناسب', fr: "Choisir la spécialité et le centre régional" },
      { step: '2. التسجيل في مباراة الانتقاء', fr: 'S\'inscrire au concours de sélection' },
      { step: '3. اجتياز الاختبارات الكتابية والشفهية', fr: 'Passer les épreuves écrites et orales' },
      { step: '4. استلام رسالة القبول والتسجيل النهائي', fr: 'Recevoir la lettre d\'admission et finaliser l\'inscription' },
    ],
    documents: ['البطاقة الوطنية', 'شهادة المستوى الدراسي المطلوب', '4 صور شخصية', 'استمارة طلب الالتحاق'],
    notes: 'OFPPT يوفر تخصصات في: الخياطة، الطهي، السياحة، الإعلاميات، البناء، وغيرها.',
    online: 'ofppt.ma',
  },

  /* ═══════════════════════════════════════════════
     10. URBANISME & CONSTRUCTION
  ════════════════════════════════════════════════ */
  {
    id: 'autorisation-construire',
    titleAr: 'رخصة البناء',
    titleFr: 'Autorisation de Construire',
    category: 'urbanisme', icon: '🏗️', color: '#92400e',
    duration: '30–90 يوم', cost: 'متغيرة حسب المساحة',
    where: 'الجماعة المحلية — مصلحة العمران', whereFr: "Commune — Service d'Urbanisme",
    description: 'الحصول على رخصة بناء قانونية قبل الشروع في أي بناء أو توسعة.',
    law: 'القانون رقم 12-90 المتعلق بالتعمير',
    steps: [
      { step: '1. تجهيز المخططات من طرف مهندس معماري مرخص', fr: 'Préparer les plans par un architecte agréé' },
      { step: '2. إيداع الملف بمصلحة العمران', fr: "Déposer le dossier au service d'urbanisme" },
      { step: '3. دراسة الملف من لجنة العمران والموافقة', fr: "Examen du dossier par la commission d'urbanisme" },
      { step: '4. استلام رخصة البناء', fr: "Retrait de l'autorisation de construire" },
    ],
    documents: ['مخططات البناء موقعة من مهندس', 'رسم الملكية أو عقد الملكية', 'استمارة طلب رخصة البناء', 'شهادة الوضع الضريبي للعقار', 'وصل أداء الرسوم'],
    notes: 'البناء دون رخصة يعرض صاحبه لهدم البناء وغرامات مالية.',
  },
  {
    id: 'conformite-bnaء',
    titleAr: 'شهادة المطابقة — انتهاء الأشغال',
    titleFr: 'Certificat de Conformité — Fin des Travaux',
    category: 'urbanisme', icon: '✅', color: '#92400e',
    duration: '15–30 يوم', cost: 'رسوم الكشف التقني',
    where: 'الجماعة المحلية — مصلحة العمران', whereFr: "Commune — Service d'Urbanisme",
    description: 'الحصول على شهادة المطابقة بعد انتهاء أشغال البناء.',
    steps: [
      { step: '1. تقديم طلب الكشف بعد انتهاء الأشغال', fr: 'Demander la visite de conformité' },
      { step: '2. زيارة ميدانية من لجنة الجماعة والتحقق', fr: 'Visite sur place et vérification' },
      { step: '3. استلام شهادة المطابقة', fr: 'Retrait du certificat de conformité' },
    ],
    documents: ['رخصة البناء الأصلية', 'مخططات البناء المُعتمدة', 'طلب الكشف الميداني'],
    notes: 'شهادة المطابقة ضرورية للتوصيل بشبكات الماء والكهرباء وتسجيل العقار.',
  },
  {
    id: 'certificat-urbanisme',
    titleAr: 'شهادة التعمير (للعقارات)',
    titleFr: 'Certificat d\'Urbanisme',
    category: 'urbanisme', icon: '📐', color: '#92400e',
    duration: '10–30 يوم', cost: 'رسوم إدارية',
    where: 'الجماعة المحلية — مصلحة التعمير', whereFr: "Commune — Service d'Urbanisme",
    description: 'شهادة تُحدد الوضع القانوني والتعميري للقطعة الأرضية أو العقار.',
    steps: [
      { step: '1. إيداع الطلب بمصلحة التعمير', fr: "Déposer la demande au service d'urbanisme" },
      { step: '2. تقديم وثائق العقار والمخططات', fr: 'Fournir les documents de la propriété et les plans' },
      { step: '3. دراسة الطلب وإصدار الشهادة', fr: 'Examen et délivrance du certificat' },
    ],
    documents: ['عقد الملكية أو الرسم العقاري', 'مخطط الموقع', 'استمارة الطلب'],
    notes: 'ضرورية للبيع والشراء والبناء ومعرفة التوجيهات العمرانية للأرض.',
  },

  /* ═══════════════════════════════════════════════
     11. FONCIER & IMMOBILIER
  ════════════════════════════════════════════════ */
  {
    id: 'titre-foncier',
    titleAr: 'التحفيظ العقاري (الرسم العقاري)',
    titleFr: 'Immatriculation Foncière — Titre Foncier',
    category: 'foncier', icon: '📌', color: '#c2410c',
    duration: '3–24 شهر', cost: '1.5–3% من القيمة',
    where: 'المحافظة العقارية المختصة — ANCFCC', whereFr: 'Conservation Foncière — ANCFCC',
    description: 'تسجيل العقار وتحفيظه في المحافظة العقارية للحصول على رسم عقاري رسمي.',
    law: 'الظهير الشريف رقم 1-11-177 المتعلق بالتحفيظ العقاري',
    steps: [
      { step: '1. تقديم مطلب التحفيظ بالمحافظة العقارية', fr: "Déposer la réquisition d'immatriculation" },
      { step: '2. إجراء مسح ميداني من طرف مهندس طبوغرافي', fr: 'Réaliser le bornage par un ingénieur géomètre' },
      { step: '3. الإعلان في الجريدة الرسمية وانتظار فترة التعرض', fr: "Publication au BO et période d'opposition" },
      { step: '4. استلام الرسم العقاري', fr: 'Retrait du titre foncier' },
    ],
    documents: ['عقود الملكية أو الإرث أو عقد البيع', 'مخططات الأرض', 'شهادة الوضع الضريبي', 'بطاقة التعريف', 'وصل الأداء'],
    notes: 'التحفيظ يضمن الحماية القانونية من النزاعات. المدة قد تمتد لسنتين.',
    online: 'ancfcc.gov.ma',
  },
  {
    id: 'mutation',
    titleAr: 'نقل الملكية العقارية (بيع أو هبة)',
    titleFr: 'Mutation Foncière — Vente ou Donation',
    category: 'foncier', icon: '🔄', color: '#c2410c',
    duration: '15–60 يوم', cost: '4% ضريبة + رسوم المحافظة',
    where: 'الموثق + المحافظة العقارية', whereFr: 'Notaire + Conservation Foncière',
    description: 'إجراء نقل ملكية عقار من البائع إلى المشتري عبر موثق عقاري معتمد.',
    steps: [
      { step: '1. إعداد عقد البيع أو الهبة لدى الموثق', fr: "Rédiger l'acte de vente ou donation chez le notaire" },
      { step: '2. أداء ضريبة التسجيل 4%', fr: "Payer la taxe d'enregistrement 4%" },
      { step: '3. إيداع الملف بالمحافظة العقارية', fr: 'Déposer le dossier à la Conservation Foncière' },
      { step: '4. استلام الرسم العقاري المحيَّن باسم المشتري', fr: 'Retrait du titre foncier mis à jour' },
    ],
    documents: ['الرسم العقاري الأصلي', 'بطاقتا التعريف للبائع والمشتري', 'عقد البيع الموثق', 'شهادة عدم الخصاص', 'وصل أداء الضرائب'],
    notes: 'الهبة بين الأصول والفروع: ضريبة 1.5%. البيع: 4%.',
  },
  {
    id: 'attestation-possession',
    titleAr: 'شهادة الحيازة (للأراضي غير المحفظة)',
    titleFr: 'Attestation de Possession Foncière',
    category: 'foncier', icon: '🌿', color: '#c2410c',
    duration: '15–60 يوم', cost: 'رسوم العدول والقضاء',
    where: 'العدول + المحكمة الابتدائية', whereFr: 'Adoul + Tribunal de Première Instance',
    description: 'إثبات حيازة الأرض غير المحفظة وتوثيقها لدى العدول قبل السعي للتحفيظ.',
    steps: [
      { step: '1. التوجه إلى عدلين لإثبات الحيازة', fr: 'Se rendre chez deux adouls pour établir la possession' },
      { step: '2. حضور شهود موثوقين يُثبتون الحيازة', fr: 'Présenter des témoins fiables attestant la possession' },
      { step: '3. استخراج وثيقة الحيازة العدلية', fr: "Obtenir l'acte adoulaire de possession" },
      { step: '4. التوجه لمطلب التحفيظ بالمحافظة العقارية', fr: 'Déposer la réquisition d\'immatriculation' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'شهادات الشهود', 'مخطط الأرض (إن وجد)', 'وثائق الملكية السابقة (إن وجدت)'],
    notes: 'الأراضي السلالية والجماعية لها إجراءات خاصة بمديرية الشؤون القروية.',
  },

  /* ═══════════════════════════════════════════════
     12. EMPLOI & CHÔMAGE
  ════════════════════════════════════════════════ */
  {
    id: 'anapec',
    titleAr: 'التسجيل في ANAPEC للبحث عن عمل',
    titleFr: "Inscription ANAPEC — Recherche d'Emploi",
    category: 'emploi', icon: '💼', color: '#0369a1',
    duration: '1–3 أيام', cost: 'مجاناً',
    where: 'أقرب وكالة ANAPEC', whereFr: 'Agence ANAPEC la plus proche',
    description: 'التسجيل في الوكالة الوطنية لإنعاش التشغيل والكفاءات للاستفادة من برامج التشغيل.',
    steps: [
      { step: '1. التوجه إلى أقرب وكالة ANAPEC أو التسجيل عبر الموقع', fr: "Se rendre à l'agence ou s'inscrire en ligne" },
      { step: '2. ملء الاستمارة وتقديم السيرة الذاتية', fr: 'Remplir le formulaire avec le CV' },
      { step: '3. الاجتماع مع مستشار التشغيل والاستفادة من التدريبات', fr: "Rencontrer le conseiller en emploi et bénéficier des formations" },
    ],
    documents: ['بطاقة التعريف الوطنية', 'السيرة الذاتية', 'الشهادات والدبلومات', 'شهادات الخبرة المهنية'],
    notes: 'برامج ANAPEC: إدماج، توظيف، تكوين مهني، دعم المقاولة.',
    online: 'anapec.org',
  },
  {
    id: 'allocation-chomage',
    titleAr: 'تعويض عن فقدان الشغل (IPE — CNSS)',
    titleFr: "Indemnité pour Perte d'Emploi (IPE) — CNSS",
    category: 'emploi', icon: '💰', color: '#0369a1',
    duration: '15–45 يوم', cost: 'مجاناً',
    where: 'وكالة CNSS الإقليمية', whereFr: 'Agence CNSS Régionale',
    description: 'الحصول على التعويض عن فقدان الشغل (IPE) من الصندوق الوطني للضمان الاجتماعي.',
    steps: [
      { step: '1. التوجه إلى وكالة CNSS خلال 60 يوماً من فقدان العمل', fr: "Se rendre à la CNSS dans les 60 jours" },
      { step: '2. تقديم طلب التعويض مع الوثائق', fr: "Déposer la demande d'indemnisation" },
      { step: '3. انتظار الموافقة والاستفادة من التعويض الشهري', fr: "Attendre l'accord et percevoir l'indemnité mensuelle" },
    ],
    documents: ['بطاقة التعريف الوطنية', 'وثيقة إنهاء عقد العمل', 'بيان الأجر الأخير', 'رقم الحساب البنكي', 'شهادة التسجيل في ANAPEC'],
    notes: 'التعويض: 70% من الأجر لمدة 6 أشهر. يُشترط 780 يوم اشتراك.',
  },
  {
    id: 'contrat-travail',
    titleAr: 'توثيق عقد العمل وتسجيله',
    titleFr: 'Enregistrement du Contrat de Travail',
    category: 'emploi', icon: '📝', color: '#0369a1',
    duration: '3–7 أيام', cost: 'رسوم التسجيل (متغيرة)',
    where: 'مفتشية الشغل + CNSS', whereFr: 'Inspection du Travail + CNSS',
    description: 'تسجيل عقد العمل لدى مفتشية الشغل وإخبار CNSS لضمان حقوق الأجراء.',
    law: 'مدونة الشغل — القانون رقم 65-99',
    steps: [
      { step: '1. تحرير عقد العمل وفق مدونة الشغل', fr: 'Rédiger le contrat de travail selon le Code du Travail' },
      { step: '2. توقيع العقد من الطرفين', fr: 'Faire signer le contrat par les deux parties' },
      { step: '3. تسجيل الأجير في CNSS خلال 30 يوماً من التعاقد', fr: 'Inscrire le salarié à la CNSS dans les 30 jours' },
      { step: '4. الاحتفاظ بنسخة من العقد لدى كلا الطرفين', fr: 'Conserver une copie chez chaque partie' },
    ],
    documents: ['عقد العمل المحرر بالعربية أو الفرنسية', 'بطاقات تعريف الطرفين'],
    notes: 'عقد غير محدد المدة هو الأصل. الفصل يستوجب إشعاراً مسبقاً.',
  },

  /* ═══════════════════════════════════════════════
     13. SANTÉ
  ════════════════════════════════════════════════ */
  {
    id: 'cnam',
    titleAr: 'الوكالة الوطنية للتأمين الصحي (ANAM)',
    titleFr: 'Agence Nationale de l\'Assurance Maladie (ANAM)',
    category: 'sante', icon: '🏥', color: '#dc2626',
    duration: '7–21 يوم', cost: 'متغيرة',
    where: 'ANAM — الوكالة الوطنية للتأمين الصحي', whereFr: 'ANAM — Agence Nationale',
    description: 'الاستفسار والتسجيل في خدمات ANAM المتعلقة بالتأمين الصحي.',
    steps: [
      { step: '1. التواصل مع ANAM عبر الهاتف أو الموقع', fr: 'Contacter l\'ANAM par téléphone ou site web' },
      { step: '2. تحديد نوع التغطية الصحية المناسبة', fr: 'Identifier le type de couverture santé adapté' },
      { step: '3. تقديم الملف اللازم والتسجيل', fr: 'Soumettre le dossier et s\'inscrire' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'وثائق حسب نوع التغطية المطلوبة'],
    notes: 'ANAM تشرف على AMO وRAMED.',
    online: 'anam.ma',
  },
  {
    id: 'carte-sante',
    titleAr: 'بطاقة الخدمات الصحية',
    titleFr: 'Carte de Services Sanitaires',
    category: 'sante', icon: '💉', color: '#dc2626',
    duration: '7–15 يوم', cost: 'رسوم إدارية بسيطة',
    where: 'المركز الصحي الجواري أو المستشفى', whereFr: 'Centre de Santé ou Hôpital',
    description: 'التسجيل في المركز الصحي للحصول على الرعاية الصحية الأساسية.',
    steps: [
      { step: '1. التوجه إلى أقرب مركز صحي', fr: 'Se rendre au centre de santé le plus proche' },
      { step: '2. التسجيل في سجل المركز وإنشاء ملف طبي', fr: 'S\'inscrire dans le registre et créer un dossier médical' },
      { step: '3. الحصول على بطاقة الخدمات الصحية', fr: 'Obtenir la carte de services sanitaires' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'دفتر المتابعة الصحية (للأطفال)'],
    notes: 'الخدمات الأساسية مجانية في المراكز الصحية العمومية.',
  },

  /* ═══════════════════════════════════════════════
     14. FISCALITÉ & IMPÔTS
  ════════════════════════════════════════════════ */
  {
    id: 'attestation-fiscale',
    titleAr: 'شهادة الوضع الضريبي',
    titleFr: 'Attestation de Situation Fiscale (ASF)',
    category: 'fiscalite', icon: '📊', color: '#6d28d9',
    duration: '1–5 أيام', cost: 'مجاناً',
    where: 'المديرية الجهوية للضرائب', whereFr: 'Direction Régionale des Impôts',
    description: 'شهادة تُثبت الوضع الضريبي النظيف للشركة أو الشخص الطبيعي.',
    steps: [
      { step: '1. التوجه إلى مكتب الضرائب المختص', fr: 'Se rendre au bureau des impôts compétent' },
      { step: '2. طلب شهادة الوضع الضريبي', fr: 'Demander l\'attestation de situation fiscale' },
      { step: '3. التحقق من خلو الذمة الضريبية وإصدار الشهادة', fr: 'Vérification et délivrance de l\'attestation' },
    ],
    documents: ['بطاقة التعريف الوطنية أو السجل التجاري', 'آخر إقرار ضريبي'],
    notes: 'مطلوبة في المناقصات والصفقات العمومية والحصول على تأشيرات.',
    online: 'tax.gov.ma',
  },
  {
    id: 'ir-declaration',
    titleAr: 'الإقرار السنوي بالدخل (الضريبة على الدخل — IR)',
    titleFr: 'Déclaration Annuelle de Revenu (IR)',
    category: 'fiscalite', icon: '💶', color: '#6d28d9',
    duration: 'أجل قانوني: 31 مارس من كل سنة', cost: 'مجاناً (الإقرار)',
    where: 'مديرية الضرائب — عبر الإنترنت', whereFr: 'DGI — simpl.tax.ma',
    description: 'الإقرار السنوي بالدخل للأشخاص الطبيعيين الملزمين بالضريبة على الدخل.',
    law: 'المدونة العامة للضرائب — المادة 82',
    steps: [
      { step: '1. تجميع وثائق الدخل (الرواتب، الإيجارات، الأرباح)', fr: 'Rassembler les documents de revenus' },
      { step: '2. ملء الإقرار إلكترونياً عبر simpl.tax.ma', fr: 'Remplir la déclaration sur simpl.tax.ma' },
      { step: '3. التحقق من المبلغ المستحق وأداؤه', fr: 'Vérifier le montant dû et le payer' },
    ],
    documents: ['شهادات الأجر (من صاحب العمل)', 'وثائق دخل الإيجار', 'آخر إقرار ضريبي'],
    notes: 'الأجل القانوني: 31 مارس. التأخر يستوجب غرامات مالية.',
    online: 'simpl.tax.ma',
  },
  {
    id: 'tva-declaration',
    titleAr: 'الإقرار بالضريبة على القيمة المضافة (TVA)',
    titleFr: 'Déclaration de la TVA',
    category: 'fiscalite', icon: '🧾', color: '#6d28d9',
    duration: 'شهري أو فصلي', cost: 'مجاناً (الإقرار)',
    where: 'مديرية الضرائب — simpl.tax.ma', whereFr: 'DGI — simpl.tax.ma',
    description: 'التصريح بالضريبة على القيمة المضافة للمقاولات الخاضعة للنظام الحقيقي.',
    law: 'المدونة العامة للضرائب — المادة 110',
    steps: [
      { step: '1. إعداد جدول TVA التفصيلي (مبيعات ومشتريات)', fr: 'Préparer le tableau TVA détaillé (ventes et achats)' },
      { step: '2. الإقرار الإلكتروني عبر simpl.tax.ma', fr: 'Déclarer électroniquement via simpl.tax.ma' },
      { step: '3. أداء الضريبة في الأجل القانوني', fr: 'Payer dans le délai légal' },
    ],
    documents: ['الفواتير الصادرة والواردة', 'كشف الحسابات البنكية'],
    notes: 'الشهري: للمقاولات بحجم معاملات > 1 مليون. الفصلي: للأقل من ذلك.',
    online: 'simpl.tax.ma',
  },

  /* ═══════════════════════════════════════════════
     15. ÉNERGIE & SERVICES PUBLICS
  ════════════════════════════════════════════════ */
  {
    id: 'abonnement-electricite',
    titleAr: 'الاشتراك في الكهرباء والماء (ONEE/RADEEF)',
    titleFr: "Abonnement Électricité & Eau (ONEE / Régies)",
    category: 'services', icon: '⚡', color: '#f59e0b',
    duration: '3–15 يوم', cost: '500–2000 درهم (رسوم الربط)',
    where: 'وكالة ONEE أو الوكالة المحلية للتوزيع (RADEEF، AMENDIS، إلخ)', whereFr: 'ONEE ou Régie locale (RADEEF, AMENDIS...)',
    description: 'الاشتراك في خدمة الكهرباء والماء لمسكن جديد أو استئناف الخدمة.',
    steps: [
      { step: '1. التوجه إلى أقرب وكالة ONEE أو الوكالة المحلية', fr: 'Se rendre à l\'agence ONEE ou locale' },
      { step: '2. تقديم ملف الاشتراك مع وثائق المسكن', fr: 'Déposer le dossier avec les documents du logement' },
      { step: '3. الفحص التقني من طرف تقني معتمد', fr: 'Inspection technique par un technicien agréé' },
      { step: '4. أداء رسوم الربط واستلام الاشتراك', fr: 'Payer les frais de raccordement et obtenir l\'abonnement' },
    ],
    documents: ['عقد الكراء أو وثيقة الملكية', 'بطاقة التعريف الوطنية', 'شهادة المطابقة الكهربائية (للوحدات الجديدة)'],
    notes: 'رسوم الربط تختلف حسب القدرة المطلوبة والمنطقة.',
    online: 'onee.ma',
  },
  {
    id: 'abonnement-internet',
    titleAr: 'طلب تركيب الإنترنت / الهاتف الثابت',
    titleFr: 'Demande d\'Installation Internet / Téléphone',
    category: 'services', icon: '📡', color: '#f59e0b',
    duration: '5–20 يوم', cost: 'حسب العرض المختار',
    where: 'وكالة مشغل الاتصالات (Maroc Telecom / Orange / Inwi)', whereFr: 'Agence opérateur (IAM / Orange / Inwi)',
    description: 'طلب تركيب خدمة الإنترنت والهاتف الثابت في المسكن أو المقر التجاري.',
    steps: [
      { step: '1. اختيار المشغل والعرض المناسب', fr: 'Choisir l\'opérateur et l\'offre adaptée' },
      { step: '2. التوجه إلى الوكالة أو الطلب عبر الإنترنت', fr: 'Se rendre à l\'agence ou commander en ligne' },
      { step: '3. تقديم وثائق السكن والتعريف', fr: 'Fournir les documents du logement et d\'identité' },
      { step: '4. انتظار الزيارة التقنية والتركيب', fr: 'Attendre la visite technique et l\'installation' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'عقد الكراء أو وثيقة التملك'],
    notes: 'تأكد من تغطية الشبكة في منطقتك قبل الاشتراك.',
  },

  /* ═══════════════════════════════════════════════
     16. LOGEMENT & AIDES
  ════════════════════════════════════════════════ */
  {
    id: 'aide-logement',
    titleAr: 'الاستفادة من دعم السكن (صندوق محمد السادس)',
    titleFr: 'Aide au Logement — Fonds Mohammed VI',
    category: 'logement', icon: '🏠', color: '#10b981',
    duration: '30–120 يوم', cost: 'مجاناً (الطلب)',
    where: 'وزارة الإسكان + بنوك معتمدة', whereFr: 'Ministère de l\'Habitat + Banques partenaires',
    description: 'الاستفادة من دعم الدولة لاقتناء مسكن أول عبر صندوق محمد السادس للسكن.',
    law: 'مرسوم رقم 2.22.780 المتعلق بمنح مساهمة الدولة في السكن',
    steps: [
      { step: '1. التحقق من الشروط (أول اقتناء، الدخل، نوع السكن)', fr: 'Vérifier les conditions (1er achat, revenu, type de logement)' },
      { step: '2. اختيار المسكن والتفاوض مع البائع', fr: 'Choisir le logement et négocier avec le vendeur' },
      { step: '3. التقدم بطلب الدعم عبر البنك الشريك', fr: 'Déposer la demande d\'aide via la banque partenaire' },
      { step: '4. انتظار الموافقة ووضع العقد وصرف الدعم', fr: 'Attendre l\'accord, signer l\'acte et percevoir l\'aide' },
    ],
    documents: ['بطاقة التعريف الوطنية', 'بيانات الدخل (3 أشهر)', 'عقد البيع أو الوعد بالبيع', 'رسم عقاري المسكن المقتنى'],
    notes: 'الدعم: 100.000 درهم للسكن الاجتماعي (300.000 درهم فأقل). 70.000 درهم للمتوسط.',
    online: 'mhpv.gov.ma',
  },
  {
    id: 'credit-logement',
    titleAr: 'طلب قرض السكن البنكي',
    titleFr: 'Demande de Crédit Immobilier',
    category: 'logement', icon: '🏦', color: '#10b981',
    duration: '15–60 يوم', cost: 'رسوم الدراسة والتأمين',
    where: 'البنوك المعتمدة (CIH، بنك الفلاحة، BMCE، إلخ)', whereFr: 'Banques agréées (CIH, Crédit Agricole, BMCE...)',
    description: 'الحصول على قرض عقاري بنكي لاقتناء مسكن أو بناء أو تجديد.',
    steps: [
      { step: '1. التقدم بطلب القرض إلى البنك مع الملف الكامل', fr: 'Déposer la demande de crédit à la banque' },
      { step: '2. دراسة الملف من طرف البنك (الدخل، الضمانات)', fr: 'Examen du dossier par la banque' },
      { step: '3. الحصول على الموافقة وتوقيع عقد القرض', fr: 'Obtenir l\'accord et signer le contrat de crédit' },
      { step: '4. الاستفادة من تمويل الاقتناء وبدء أداء الأقساط', fr: 'Bénéficier du financement et commencer les remboursements' },
    ],
    documents: ['آخر 3 أشهر من بيانات الأجر', 'عقد العمل', 'كشف الحسابات البنكية (6 أشهر)', 'عقد البيع أو الوعد بالبيع', 'وثائق العقار (رسم عقاري)'],
    notes: 'نسبة الاقتطاع لا تتجاوز 40% من الدخل الشهري. مدة القرض: 7–25 سنة.',
  },
];

const CATEGORIES = [
  { id: 'all', label: 'الكل', fr: 'Tous', icon: '📋' },
  { id: 'cin', label: 'البطاقة الوطنية', fr: 'Carte Nationale', icon: '🪪' },
  { id: 'permis', label: 'السياقة والسيارات', fr: 'Conduite & Véhicules', icon: '🚗' },
  { id: 'passeport', label: 'جواز السفر والسفر', fr: 'Passeport & Voyage', icon: '📕' },
  { id: 'etat-civil', label: 'الحالة المدنية', fr: 'État Civil', icon: '📑' },
  { id: 'commune', label: 'خدمات الجماعة', fr: 'Services Commune', icon: '🏘️' },
  { id: 'commerce', label: 'التجارة والمقاولات', fr: 'Commerce & Entreprise', icon: '🏪' },
  { id: 'sociale', label: 'الحماية الاجتماعية', fr: 'Protection Sociale', icon: '🤝' },
  { id: 'justice', label: 'العدل والقضاء', fr: 'Justice', icon: '⚖️' },
  { id: 'education', label: 'التعليم والتكوين', fr: 'Éducation & Formation', icon: '📚' },
  { id: 'urbanisme', label: 'العمران والبناء', fr: 'Urbanisme & Construction', icon: '🏗️' },
  { id: 'foncier', label: 'العقار والتحفيظ', fr: 'Foncier & Immobilier', icon: '📌' },
  { id: 'emploi', label: 'الشغل والتوظيف', fr: 'Emploi & Chômage', icon: '💼' },
  { id: 'sante', label: 'الصحة', fr: 'Santé', icon: '🏥' },
  { id: 'fiscalite', label: 'الضرائب والجبايات', fr: 'Fiscalité & Impôts', icon: '💶' },
  { id: 'services', label: 'الخدمات العمومية', fr: 'Services Publics', icon: '⚡' },
  { id: 'logement', label: 'السكن والقروض', fr: 'Logement & Crédit', icon: '🏠' },
];

const ITEMS_PER_PAGE = 10;

export default function AdminProcedures() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedProc, setSelectedProc] = useState<Procedure | null>(null);
  const [search, setSearch] = useState('');
  const [lang, setLang] = useState<'ar' | 'fr'>('ar');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const filtered = PROCEDURES.filter(p => {
    const catMatch = selectedCategory === 'all' || p.category === selectedCategory;
    const q = search.toLowerCase();
    const textMatch = !q || p.titleAr.includes(q) || p.titleFr.toLowerCase().includes(q) || p.description.includes(q);
    return catMatch && textMatch;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setCurrentPage(1); setSelectedProc(null); };
  const handleSearch = (q: string) => { setSearch(q); setCurrentPage(1); setSelectedProc(null); };

  const handleProcClick = (proc: Procedure) => {
    const next = selectedProc?.id === proc.id ? null : proc;
    setSelectedProc(next);
    if (next && isMobile) {
      setTimeout(() => {
        document.getElementById(`proc-detail-${proc.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    }
  };

  return (
    <div className="animate-fadeIn" style={{ padding: '24px 36px', background: '#f8fafc', minHeight: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#0f2744,#1e4976)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🏛️</div>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: '#0f2744', margin: 0 }}>المساطر الإدارية</h2>
          <p style={{ color: '#64748b', fontSize: 11, margin: 0, fontFamily: 'Inter,sans-serif' }}>
            Procédures Administratives — دليل المرتفقين 2025–2026
          </p>
        </div>
        <div style={{ marginRight: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1.5px solid #e2e8f0' }}>
            {(['ar', 'fr'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '7px 14px', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, background: lang === l ? '#0f2744' : 'white', color: lang === l ? 'white' : '#64748b' }}>
                {l === 'ar' ? '🇲🇦 عربي' : '🇫🇷 FR'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="🔍 ابحث عن إجراء... (Rechercher une procédure...)"
          dir="auto"
          style={{ width: '100%', padding: '12px 44px 12px 44px', borderRadius: 10, border: '1.5px solid #e2e8f0', fontSize: 13, fontFamily: 'inherit', background: 'white', color: '#1e293b', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
        />
        {search && (
          <button onClick={() => handleSearch('')} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#94a3b8' }}>✕</button>
        )}
      </div>

      {/* Categories */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map(cat => (
          <button key={cat.id} onClick={() => handleCategoryChange(cat.id)}
            style={{
              padding: '6px 13px', borderRadius: 22, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11, fontWeight: 700, transition: 'all 0.15s',
              background: selectedCategory === cat.id ? '#0f2744' : 'white',
              color: selectedCategory === cat.id ? 'white' : '#475569',
              boxShadow: selectedCategory === cat.id ? '0 2px 10px rgba(15,39,68,0.25)' : '0 1px 3px rgba(0,0,0,0.07)',
              border: selectedCategory === cat.id ? '1.5px solid #0f2744' : '1px solid #e2e8f0',
            }}>
            {cat.icon} {lang === 'ar' ? cat.label : cat.fr}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { n: PROCEDURES.length, label: lang === 'ar' ? 'إجراء متاح' : 'Procédures', color: '#0891b2' },
          { n: filtered.length, label: lang === 'ar' ? 'نتيجة' : 'Résultats', color: '#059669' },
          { n: CATEGORIES.length - 1, label: lang === 'ar' ? 'فئة' : 'Catégories', color: '#7c3aed' },
          { n: PROCEDURES.filter(p => p.online).length, label: lang === 'ar' ? 'إلكتروني' : 'En ligne', color: '#1d4ed8' },
        ].map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: 10, padding: '10px 18px', border: `1.5px solid ${s.color}20`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20, fontWeight: 900, color: s.color }}>{s.n}</span>
            <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: isMobile ? 'block' : (selectedProc ? 'grid' : 'block'), gridTemplateColumns: selectedProc ? '1fr 440px' : '1fr', gap: 20, alignItems: 'start' }}>

        {/* Grid */}
        <div>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 12, border: '2px dashed #e2e8f0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#94a3b8' }}>{lang === 'ar' ? 'لا توجد نتائج' : 'Aucun résultat'}</div>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: isMobile ? 0 : 12 }}>
                {paginated.map(proc => (
                  <div key={proc.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Card Button */}
                    <button onClick={() => handleProcClick(proc)}
                      style={{
                        borderRadius: isMobile ? 0 : 12,
                        padding: isMobile ? '14px 16px' : '16px',
                        textAlign: 'right',
                        border: 'none',
                        borderBottom: isMobile ? `1px solid #e2e8f0` : 'none',
                        borderRight: isMobile && selectedProc?.id === proc.id ? `4px solid ${proc.color}` : isMobile ? '4px solid transparent' : 'none',
                        outline: selectedProc?.id === proc.id && !isMobile ? `2px solid ${proc.color}` : 'none',
                        boxShadow: !isMobile && selectedProc?.id === proc.id ? `0 4px 20px ${proc.color}25` : !isMobile ? '0 1px 4px rgba(0,0,0,0.05)' : 'none',
                        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.18s',
                        width: '100%',
                        backgroundColor: isMobile && selectedProc?.id === proc.id ? `${proc.color}08` : 'white',
                      } as React.CSSProperties}
                      onMouseEnter={e => { if (!isMobile && selectedProc?.id !== proc.id) { e.currentTarget.style.boxShadow = `0 4px 16px ${proc.color}20`; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                      onMouseLeave={e => { if (!isMobile && selectedProc?.id !== proc.id) { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; } }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: isMobile ? 36 : 42, height: isMobile ? 36 : 42, background: `${proc.color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: isMobile ? 18 : 20, flexShrink: 0, border: `1.5px solid ${proc.color}30` }}>
                          {proc.icon}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                          <div style={{ fontSize: isMobile ? 13 : 12.5, fontWeight: 800, color: '#0f2744', lineHeight: 1.4, marginBottom: 2 }}>
                            {lang === 'ar' ? proc.titleAr : proc.titleFr}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: isMobile ? 'normal' : 'nowrap' }}>
                            {lang === 'fr' ? proc.titleAr : proc.titleFr}
                          </div>
                          {isMobile && (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 5 }}>
                              <span style={{ background: `${proc.color}12`, color: proc.color, borderRadius: 20, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>⏱ {proc.duration}</span>
                              <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>💰 {proc.cost}</span>
                              {proc.online && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '2px 7px', fontSize: 9, fontWeight: 700 }}>🌐 En ligne</span>}
                            </div>
                          )}
                        </div>
                        {isMobile && (
                          <div style={{ fontSize: 18, color: proc.color, flexShrink: 0, transition: 'transform 0.2s', transform: selectedProc?.id === proc.id ? 'rotate(90deg)' : 'none' }}>›</div>
                        )}
                      </div>
                      {!isMobile && (
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                          <span style={{ background: `${proc.color}12`, color: proc.color, borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>⏱ {proc.duration}</span>
                          <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>💰 {proc.cost}</span>
                          {proc.online && <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>🌐 En ligne</span>}
                          {proc.law && <span style={{ background: '#fefce8', color: '#b45309', borderRadius: 20, padding: '3px 8px', fontSize: 10, fontWeight: 700 }}>⚖️ قانوني</span>}
                        </div>
                      )}
                    </button>

                    {/* Inline Accordion Detail — Mobile Only */}
                    {isMobile && selectedProc?.id === proc.id && (
                      <div id={`proc-detail-${proc.id}`}
                        style={{ background: 'white', borderRight: `4px solid ${proc.color}`, borderBottom: `2px solid ${proc.color}30`, overflow: 'hidden' }}>

                        {/* Color header */}
                        <div style={{ background: `linear-gradient(135deg, ${proc.color}, ${proc.color}cc)`, padding: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <span style={{ fontSize: 28 }}>{proc.icon}</span>
                            <button onClick={() => setSelectedProc(null)}
                              style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, width: 32, height: 32, cursor: 'pointer', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </div>
                          <div style={{ fontSize: 14, fontWeight: 900, color: 'white', lineHeight: 1.4 }}>
                            {lang === 'ar' ? proc.titleAr : proc.titleFr}
                          </div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 3, fontFamily: 'Inter,sans-serif' }}>
                            {lang === 'fr' ? proc.titleAr : proc.titleFr}
                          </div>
                        </div>

                        {/* Detail body */}
                        <div style={{ padding: '14px 16px' }}>

                          {/* Info grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                            <InfoBox icon="⏱" label={lang === 'ar' ? 'المدة' : 'Durée'} value={proc.duration} />
                            <InfoBox icon="💰" label={lang === 'ar' ? 'التكلفة' : 'Coût'} value={proc.cost} />
                            <div style={{ gridColumn: '1/-1' }}>
                              <InfoBox icon="📍" label={lang === 'ar' ? 'الجهة المختصة' : "Où s'adresser"} value={lang === 'ar' ? proc.where : proc.whereFr} />
                            </div>
                            {proc.law && (
                              <div style={{ gridColumn: '1/-1' }}>
                                <InfoBox icon="⚖️" label={lang === 'ar' ? 'المرجع القانوني' : 'Référence légale'} value={proc.law} highlight />
                              </div>
                            )}
                            {proc.online && (
                              <div style={{ gridColumn: '1/-1' }}>
                                <InfoBox icon="🌐" label={lang === 'ar' ? 'إلكترونياً' : 'En ligne'} value={proc.online} link />
                              </div>
                            )}
                          </div>

                          {/* Description */}
                          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8, marginBottom: 14, padding: '10px 12px', background: `${proc.color}08`, borderRadius: 8, borderRight: `3px solid ${proc.color}` }}>
                            {proc.description}
                          </div>

                          {/* Steps */}
                          <div style={{ marginBottom: 14 }}>
                            <SectionTitle icon="📋" color={proc.color} label={lang === 'ar' ? 'خطوات الإجراء' : 'Étapes'} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {proc.steps.map((s, si) => (
                                <div key={si} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                  <div style={{ width: 20, height: 20, background: proc.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 900, flexShrink: 0 }}>{si + 1}</div>
                                  <div>
                                    <div style={{ fontSize: 11.5, color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>{lang === 'ar' ? s.step.replace(/^\d+\.\s*/, '') : s.fr}</div>
                                    <div style={{ fontSize: 9.5, color: '#94a3b8', fontFamily: 'Inter,sans-serif', marginTop: 1 }}>{lang === 'fr' ? s.step.replace(/^\d+\.\s*/, '') : s.fr}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Documents */}
                          <div style={{ marginBottom: 12 }}>
                            <SectionTitle icon="📂" color="#059669" label={lang === 'ar' ? 'الوثائق المطلوبة' : 'Documents requis'} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                              {proc.documents.map((doc, di) => (
                                <div key={di} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', background: '#f0fdf4', borderRadius: 7, border: '1px solid #bbf7d0' }}>
                                  <span style={{ color: '#15803d', fontSize: 12, flexShrink: 0 }}>✓</span>
                                  <span style={{ fontSize: 11.5, color: '#1e293b', lineHeight: 1.5 }}>{doc}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          {proc.notes && (
                            <div style={{ background: '#fffbeb', borderRadius: 9, padding: '11px 13px', border: '1px solid #fde68a' }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', marginBottom: 4 }}>💡 {lang === 'ar' ? 'ملاحظات مهمة' : 'Notes importantes'}</div>
                              <div style={{ fontSize: 11.5, color: '#92400e', lineHeight: 1.8 }}>{proc.notes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 20, flexWrap: 'wrap' }}>
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: currentPage === 1 ? '#f8fafc' : 'white', color: currentPage === 1 ? '#cbd5e1' : '#0f2744', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                    {lang === 'ar' ? '→ السابق' : '← Préc.'}
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => setCurrentPage(page)}
                      style={{ width: 36, height: 36, borderRadius: 8, border: page === currentPage ? '2px solid #0f2744' : '1.5px solid #e2e8f0', background: page === currentPage ? '#0f2744' : 'white', color: page === currentPage ? 'white' : '#475569', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                      {page}
                    </button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: currentPage === totalPages ? '#f8fafc' : 'white', color: currentPage === totalPages ? '#cbd5e1' : '#0f2744', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 13 }}>
                    {lang === 'ar' ? '← التالي' : 'Suiv. →'}
                  </button>
                  <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'Inter,sans-serif' }}>
                    {lang === 'ar' ? `صفحة ${currentPage} من ${totalPages} — ${filtered.length} إجراء` : `Page ${currentPage}/${totalPages} — ${filtered.length} procédures`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Detail Panel — Desktop Only */}
        {selectedProc && !isMobile && (
          <div style={{ background: 'white', borderRadius: 14, border: `2px solid ${selectedProc.color}30`, overflow: 'hidden', boxShadow: `0 4px 24px ${selectedProc.color}15`, position: 'sticky', top: 80 }}>
            <div style={{ background: `linear-gradient(135deg, ${selectedProc.color}, ${selectedProc.color}bb)`, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: 34 }}>{selectedProc.icon}</div>
                <button onClick={() => setSelectedProc(null)}
                  style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', color: 'white', fontSize: 14, fontFamily: 'inherit' }}>✕</button>
              </div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'white', marginTop: 10, lineHeight: 1.4 }}>
                {lang === 'ar' ? selectedProc.titleAr : selectedProc.titleFr}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4, fontFamily: 'Inter,sans-serif' }}>
                {lang === 'fr' ? selectedProc.titleAr : selectedProc.titleFr}
              </div>
            </div>

            <div style={{ padding: '18px 22px', overflow: 'auto', maxHeight: '72vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                <InfoBox icon="⏱" label={lang === 'ar' ? 'المدة' : 'Durée'} value={selectedProc.duration} />
                <InfoBox icon="💰" label={lang === 'ar' ? 'التكلفة' : 'Coût'} value={selectedProc.cost} />
                <div style={{ gridColumn: '1/-1' }}>
                  <InfoBox icon="📍" label={lang === 'ar' ? 'الجهة المختصة' : "Où s'adresser"} value={lang === 'ar' ? selectedProc.where : selectedProc.whereFr} />
                </div>
                {selectedProc.law && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <InfoBox icon="⚖️" label={lang === 'ar' ? 'المرجع القانوني' : 'Référence légale'} value={selectedProc.law} highlight />
                  </div>
                )}
                {selectedProc.online && (
                  <div style={{ gridColumn: '1/-1' }}>
                    <InfoBox icon="🌐" label={lang === 'ar' ? 'إلكترونياً' : 'En ligne'} value={selectedProc.online} link />
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12.5, color: '#475569', lineHeight: 1.9, marginBottom: 16, padding: '10px 12px', background: `${selectedProc.color}08`, borderRadius: 8, borderRight: `3px solid ${selectedProc.color}` }}>
                {selectedProc.description}
              </div>

              <div style={{ marginBottom: 16 }}>
                <SectionTitle icon="📋" color={selectedProc.color} label={lang === 'ar' ? 'خطوات الإجراء' : 'Étapes de la procédure'} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {selectedProc.steps.map((s, si) => (
                    <div key={si} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 11px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div style={{ width: 22, height: 22, background: selectedProc.color, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 900, flexShrink: 0 }}>{si + 1}</div>
                      <div>
                        <div style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, lineHeight: 1.5 }}>{lang === 'ar' ? s.step.replace(/^\d+\.\s*/, '') : s.fr}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: 'Inter,sans-serif', marginTop: 1 }}>{lang === 'fr' ? s.step.replace(/^\d+\.\s*/, '') : s.fr}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <SectionTitle icon="📂" color="#059669" label={lang === 'ar' ? 'الوثائق المطلوبة' : 'Documents requis'} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {selectedProc.documents.map((doc, di) => (
                    <div key={di} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '7px 10px', background: '#f0fdf4', borderRadius: 7, border: '1px solid #bbf7d0' }}>
                      <span style={{ color: '#15803d', fontSize: 12, flexShrink: 0 }}>✓</span>
                      <span style={{ fontSize: 12, color: '#1e293b', lineHeight: 1.5 }}>{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedProc.notes && (
                <div style={{ background: '#fffbeb', borderRadius: 9, padding: '12px 14px', border: '1px solid #fde68a' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#d97706', marginBottom: 5 }}>💡 {lang === 'ar' ? 'ملاحظات مهمة' : 'Notes importantes'}</div>
                  <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.8 }}>{selectedProc.notes}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoBox({ icon, label, value, highlight, link }: { icon: string; label: string; value: string; highlight?: boolean; link?: boolean }) {
  return (
    <div style={{ background: highlight ? '#fefce8' : link ? '#eff6ff' : '#f8fafc', borderRadius: 8, padding: '9px 12px', border: `1px solid ${highlight ? '#fde68a' : link ? '#bfdbfe' : '#e2e8f0'}` }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 3 }}>{icon} {label}</div>
      <div style={{ fontSize: 12, color: highlight ? '#92400e' : link ? '#1d4ed8' : '#0f2744', fontWeight: 700, lineHeight: 1.4 }}>{value}</div>
    </div>
  );
}

function SectionTitle({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 800, color: '#0f2744', marginBottom: 9, display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ background: color, color: 'white', borderRadius: 6, padding: '2px 7px', fontSize: 10 }}>{icon}</span>
      {label}
    </div>
  );
}
