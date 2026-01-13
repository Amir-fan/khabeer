/**
 * News synchronization service
 * Fetches news from NewsAPI and stores AAOIFI fatwas
 */

import { logger } from "./logger.js";
import { getDb } from "../db.js";
import { news } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

import { ENV } from "./env.js";

const NEWS_API_KEY = ENV.newsApiKey;
const NEWS_API_BASE = "https://newsapi.org/v2";

// Category mapping from NewsAPI to our categories
const categoryMapping: Record<string, "stocks" | "sukuk" | "banking" | "general"> = {
  business: "stocks",
  finance: "banking",
  economics: "banking",
};

// AAOIFI Fatwa content (provided by user)
const AAOIFI_FATWAS = [
  {
    title: "بالتعاون مع وزارة الاقتصاد في جمهورية تاتارستان أيوفي تطلق أول مركز إقليمي لتطوير التمويل الإسلامي التشاركي في قازان",
    summary: "أعلنت هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (أيوفي) عن الافتتاح الرسمي لـ 'مركز أيوفي لتطوير المالية الإسلامية' في مدينة قازان، حيث تمثل هذه الخطوة علامة فارقة وتاريخية للنهوض بقطاع التمويل الإسلامي (التشاركي) في جمهورية تاتارستان، وروسيا الاتحادية، ودول رابطة الدول المستقلة",
    content: `قازان، جمهورية تتارستان – أعلنت هيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (أيوفي) عن الافتتاح الرسمي لـ 'مركز أيوفي لتطوير المالية الإسلامية' في مدينة قازان، حيث تمثل هذه الخطوة علامة فارقة وتاريخية للنهوض بقطاع التمويل الإسلامي (التشاركي) في جمهورية تاتارستان، وروسيا الاتحادية، ودول رابطة الدول المستقلة حيث تفضل فخامة السيد رستم مينيخانوف، رئيس جمهورية تاتارستان، بافتتاح المركز والذي تستضيفه وزارة الاقتصاد في الجمهورية. يمثل هذا المركز أول مكتب إقليمي لأيوفي ليكون حجر الزاوية في بناء قطاع تمويل تشاركي موثوق ومنضبط بالمعايير الدولية، لخدمة الاقتصاد في تاتارستان وروسيا وكذلك دول رابطة الدول المستقلة. كما عُقد في موسكو اجتماعاً رفيع المستوى بين معالي الشيخ إبراهيم بن خليفة آل خليفة، رئيس مجلس أمناء أيوفي، وسعادة السيدة إلفيرا نابيولينا، محافظ البنك المركزي الروسي. حيث جرى خلال الاجتماع استعراض خطة البنك المركزي الروسي للتمويل التشاركي، بما في ذلك تمديد البرنامج التجريبي حتى عام 2028، وبحث إمكانية إدراجه ضمن النظام المالي الوطني. وقد أكد الجانبان على أهمية موائمة ممارسات التمويل التشاركي مع معايير 'أيوفي' المعترف بها عالمياً، سعياً لتعزيز ثقة المستثمرين في أدوات الاستثمار. وعلى جانب آخر من حفل الافتتاح، تم عقد طاولة مستديرة متخصصة بعنوان "دور وأهداف المركز التمثيلي لأيوفي في تطوير التمويل التشاركي في دول رابطة الدول المستقلة" وذلك بحضور ممثلين عن البنك المركزي الروسي وكذلك وفود رفيعة المستوى من مختلف دول الرابطة. وقد تركزت النقاشات حول دور المركز في تعزيزالمحاور التالية: تطوير الأطر التنظيمية والرقابية وفق معايير أيوفي; توفير الدعم الفني والاستشاري; تعزيز الكفاءة المؤسسية; تنمية قدرات الكوادر البشرية وذلك لتوفير حلول مالية شاملة والتي ترتبط بالموجودات العينية على مبدأ تشارك المخاطر، لخدمة سكان المنطقة من المجتمعات المسلمة وغير المسلمة على حد سواء. وخلال حفل الافتتاح، أكد فخامة الرئيس رستم مينيخانوف " أن إطلاق مركز أيوفي لتطوير المالية الإسلامية في قازان يشكل خطوة جوهرية نحو النهوض بالتمويل التشاركي في جمهورية تاتارستان. كما يترجم المشروع حرص الجمهورية على تطوير هذا القطاع وفق قواعد مؤسسية راسخة، بما يكفل دعم الاستثمارات المستدامة، والشركات المتناهية الصغر والصغيرة والمتوسطة، والاقتصاد الحقيقي. كما أكد فخامته أن الرؤية تهدف إلى ترسيخ مكانة قازان كمرجع محوري لتنمية التمويل التشاركي في دول رابطة الدول المستقلة، وربطها بالمنظومة المالية العالمية". وفي ذات السياق، صرحت سعادة إلفيرا نابيولينا محافظ البنك المركزي الروسي: "أن العمل يتواصل بالبرنامج التجريبي للتمويل التشاركي في أقاليم مختارة حتى عام 2028، وذلك لتقييم مردوداته المستقبلية وذلك لبحث سبل دمجه في المنظومة المالية الوطنية بمنهجية مستدامة ومسؤولة عند الضرورة. كما يُعد الالتزام بالمعايير العالمية، وخاصة معايير "أيوفي"، ركيزة جوهرية لتعزيز مستويات الشفافية والمصداقية، وترسيخ الثقة بين كافة الأطراف الفاعلة في السوق". كما صرح معالي الشيخ إبراهيم بن خليفة آل خليفة رئيس مجلس أمناء أيوفي قائلا: «إن تأسيس مركز "أيوفي" لتطوير المالية الإسلامية في قازان يعكس إيماننا بالإمكانات الواعدة والفرص طويلة الأجل التي تزخر بها منطقة رابطة الدول المستقلة في مجال التمويل التشاركي. كما نعرب عن تقديرنا للثقة التي أولتها لنا القيادة في روسيا الاتحادية وتاتارستان. ونأمل أن تتحول قازان إلى محور إقليمي للتمويل التشاركي لربط الاقتصاديات في دول الرابطة بأسواق الشرق الأوسط وجنوب آسيا، في ظل معايير قوية، وكفاءات مهنية، وتطبيقات متينة». وقد حضر حفل الافتتاح وفد رسمي رفيع المستوى تمثل في معالي السيد أنطون سيلوانوف، وزير مالية روسيا الاتحادية، والسيد أناتولي أكساكوف، رئيس لجنة الأسواق المالية بمجلس الدوما، والسيد أليكسي غوزنوف، سكرتير الدولة ونائب محافظ البنك المركزي لروسيا الاتحادية، إلى جانب عدد من كبار المسؤولين؛ مما يؤكد على تضافر الجهود المؤسسية الروسية لتعزيز صناعة التمويل التشاركي. ومن أهم أهداف مركز أيوفي لتطوير المالية الإسلامية ما يلي: المساهمة في رسم خارطة طريق إقليمية مدتها خمس سنوات، بالتعاون مع البنك الإسلامي للتنمية وأصحاب المصالح ذات العلاقة; تسهيل اعتماد معايير أيوفي وتوحيد ممارساتها؛ توفير المساندة الفنية والاستشارية للجهات الرقابية، والبنوك، ومصدري الصكوك; تعزيز الخبرات المحلية والقدرات المؤسسية في دول رابطة الدول المستقلة.`,
    source: "AAOIFI",
    category: "fatwas" as const,
    publishedAt: new Date("2026-01-08"),
  },
  {
    title: "مجلس الحوكمة والأخلاقيات التابع لهيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية يعيد إصدار مسودة معيار الحوكمة 'تطوير وحوكمة المعدلات المرجعية المتوافقة مع الشريعة'، وذلك لإدراج النماذج التوضيحية ضمنه",
    summary: "وافق مجلس الحوكمة والأخلاقيات (المجلس) التابع لهيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (أيوفي)، من حيث المبدأ، على إعادة إصدار مسودة معيار الحوكمة 'تطوير وحوكمة المعدلات المرجعية المتوافقة مع الشريعة' في اجتماعيه الثاني والأربعين والثالث والأربعين.",
    content: `وافق مجلس الحوكمة والأخلاقيات (المجلس) التابع لهيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (أيوفي)، من حيث المبدأ وافق مجلس الحوكمة والأخلاقيات (المجلس) التابع لهيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية (أيوفي)، من حيث المبدأ، على إعادة إصدار مسودة معيار الحوكمة _"تطوير وحوكمة المعدلات المرجعية المتوافقة مع الشريعة" في اجتماعيه الثاني والأربعين والثالث والأربعين. تم إصدار مسودة معيار الحوكمة__"تطوير وحوكمة المعدلات المرجعية المتوافقة مع الشريعة" مبدئياً للتشاور العام في عام 2022، وذلك بناءً على قرار من المجلس يقضي بتطوير نماذج توضيحية للمعدلات المرجعية المتوافقة مع الشريعة، بما يتماشى مع متطلبات المعيار، وإدراجها كملاحق في مرحلة لاحقة. وفي عام 2025، وبعد إجراء مراجعات ومداولات مستفيضة من قبل مجموعة العمل المعنية، قام المجلس بمراجعة الملاحق التي تم تطويرها لاحقاً، وهي: "النموذج التوضيحي: المعدل المرجعي المتوافق مع الشريعة القائم على مؤشرات الاقتصاد الكلي" و"النموذج التوضيحي: المعدل المرجعي المتوافق مع الشريعة القائم على بيانات الأسواق المالية الإسلامية". وتبيّن هذه النماذج التوضيحية الهيكل والخصائص وسير العمل التي تستند إليها الأسس المتوافقة مع الشريعة لاحتساب هذه المعدلات. وبعد هذه المراجعة، وافق المجلس، من حيث المبدأ، على إعادة إصدار مسودة المعيار للتشاور العام مرفقة بالملاحق التوضيحية، كما قرر أن يتم تطوير نماذج إضافية قائمة على متغيرات الاقتصاد الجزئي، إلى جانب المواد البحثية ذات الصلة، في مرحلة لاحقة في شكل مذكرة إرشادية. وبهذه المناسبة، صرّح السيد فاروق رازا، رئيس مجلس الحوكمة والأخلاقيات، قائلاً: "أودّ أن أُعرب عن خالص تقديري لأعضاء المجلس، وفريق الأمانة العامة، ومجموعة العمل المعنية، على جهودهم المتواصلة وإسهاماتهم القيّمة". وأضاف قائلاً: "يسرّني إعادة إصدار مسودة معيار الحوكمة _"تطوير وحوكمة المعدلات المرجعية المتوافقة مع الشريعة". وأعتقد أن ذلك سيسهم في دعم الأسواق في وضع الأسس اللازمة للتطبيق العملي للمعدلات المرجعية المتوافقة مع الشريعة على نطاق واسع، بما يعزّز مستوى الشفافية والالتزام بمبادئ الشريعة وأحكامها في جميع معاملات المالية الإسلامية". كما صرّح السيد عمر مصطفى أنصاري، الأمين العام لأيوفي، قائلاً: "أعتقد أن هذا المعيار، عند إصداره في صيغته النهائية، سيلعب دوراً محورياً في تسعير المعاملات المالية الإسلامية، وفي تسهيل الانتقال بعيداً عن المعدلات المرجعية القائمة على أسعار الفائدة التقليدية". وأضاف قائلاً: "وفيما يتعلق بالخطوات المقبلة، ستبدأ عملية التشاور العام، حيث سندعو الجهات المعنية في الصناعة، والسلطات التنظيمية والرقابية، وعلماء الشريعة، وغيرهم من المهتمين، إلى تقديم ملاحظاتهم على النماذج التوضيحية. وسيتم تجميع جميع الملاحظات الواردة ومراجعتها بعناية، كما سيتم إدراج أي تعديلات مناسبة قبل اصدار المعيار في صيغته النهائية".`,
    source: "AAOIFI",
    category: "fatwas" as const,
    publishedAt: new Date("2025-12-31"),
  },
];

interface NewsAPIArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  source: { name: string };
}

/**
 * Fetch news from NewsAPI
 */
async function fetchNewsFromAPI(): Promise<NewsAPIArticle[]> {
  try {
    // Search for Islamic finance, banking, sukuk related news
    const queries = [
      "islamic finance",
      "sukuk",
      "sharia banking",
      "islamic banking",
      "halal finance",
    ];

    const allArticles: NewsAPIArticle[] = [];

    for (const query of queries) {
      try {
        const url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(query)}&language=ar&sortBy=publishedAt&pageSize=20&apiKey=${NEWS_API_KEY}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          logger.warn(`NewsAPI request failed for query "${query}"`, { status: response.status });
          continue;
        }

        const data = await response.json();
        if (data.status === "ok" && data.articles) {
          allArticles.push(...data.articles);
        }
      } catch (error) {
        logger.warn(`Error fetching news for query "${query}"`, error instanceof Error ? error : new Error(String(error)));
      }
    }

    // Remove duplicates based on title
    const uniqueArticles = allArticles.filter((article, index, self) =>
      index === self.findIndex((a) => a.title === article.title)
    );

    return uniqueArticles.slice(0, 50); // Limit to 50 articles
  } catch (error) {
    logger.error("Failed to fetch news from NewsAPI", error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Map NewsAPI article to our news schema
 */
function mapNewsAPIArticle(article: NewsAPIArticle): {
  title: string;
  summary: string;
  content: string;
  source: string;
  sourceUrl: string;
  imageUrl: string | null;
  category: "stocks" | "gold" | "fatwas" | "markets" | "general";
  publishedAt: Date;
} {
  // Determine category based on content
  const titleLower = article.title.toLowerCase();
  const contentLower = (article.description || article.content || "").toLowerCase();
  
  let category: "stocks" | "gold" | "fatwas" | "markets" | "general" = "general";
  
  if (titleLower.includes("صكوك") || contentLower.includes("صكوك") || titleLower.includes("sukuk")) {
    category = "markets"; // Use "markets" for sukuk since schema doesn't have "sukuk"
  } else if (titleLower.includes("بنك") || contentLower.includes("بنك") || titleLower.includes("bank") || titleLower.includes("banking")) {
    category = "markets"; // Use "markets" for banking
  } else if (titleLower.includes("سهم") || titleLower.includes("أسهم") || titleLower.includes("stock") || titleLower.includes("equity")) {
    category = "stocks";
  } else if (titleLower.includes("finance") || titleLower.includes("مالي") || titleLower.includes("اقتصاد")) {
    category = "markets";
  } else if (titleLower.includes("ذهب") || titleLower.includes("gold")) {
    category = "gold";
  }

  return {
    title: article.title,
    summary: article.description || article.content?.slice(0, 300) || "",
    content: article.content || article.description || "",
    source: article.source.name,
    sourceUrl: article.url,
    imageUrl: article.urlToImage,
    category,
    publishedAt: new Date(article.publishedAt),
  };
}

/**
 * Check if news article already exists (by title)
 */
async function newsExists(title: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  
  try {
    const existing = await db
      .select()
      .from(news)
      .where(eq(news.title, title))
      .limit(1);
    
    return existing.length > 0;
  } catch {
    return false;
  }
}

/**
 * Sync news from NewsAPI
 */
export async function syncNewsFromAPI(): Promise<{ added: number; skipped: number }> {
  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping news sync");
    return { added: 0, skipped: 0 };
  }

  try {
    logger.info("Starting news sync from NewsAPI");
    const articles = await fetchNewsFromAPI();
    
    let added = 0;
    let skipped = 0;

    for (const article of articles) {
      try {
        // Check if already exists
        if (await newsExists(article.title)) {
          skipped++;
          continue;
        }

        const mapped = mapNewsAPIArticle(article);
        await db.insert(news).values(mapped);
        added++;
      } catch (error) {
        logger.warn(`Failed to insert news article: ${article.title}`, error instanceof Error ? error : new Error(String(error)));
        skipped++;
      }
    }

    logger.info(`News sync completed: ${added} added, ${skipped} skipped`);
    return { added, skipped };
  } catch (error) {
    logger.error("Failed to sync news from API", error instanceof Error ? error : new Error(String(error)));
    return { added: 0, skipped: 0 };
  }
}

/**
 * Sync AAOIFI fatwas
 */
export async function syncAAOIFIFatwas(): Promise<{ added: number; skipped: number }> {
  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping AAOIFI fatwa sync");
    return { added: 0, skipped: 0 };
  }

  try {
    logger.info("Starting AAOIFI fatwa sync");
    let added = 0;
    let skipped = 0;

    for (const fatwa of AAOIFI_FATWAS) {
      try {
        // Check if already exists
        if (await newsExists(fatwa.title)) {
          skipped++;
          continue;
        }

        await db.insert(news).values({
          title: fatwa.title,
          summary: fatwa.summary,
          content: fatwa.content,
          source: fatwa.source,
          category: fatwa.category,
          publishedAt: fatwa.publishedAt,
        });
        added++;
      } catch (error) {
        logger.warn(`Failed to insert AAOIFI fatwa: ${fatwa.title}`, error instanceof Error ? error : new Error(String(error)));
        skipped++;
      }
    }

    logger.info(`AAOIFI fatwa sync completed: ${added} added, ${skipped} skipped`);
    return { added, skipped };
  } catch (error) {
    logger.error("Failed to sync AAOIFI fatwas", error instanceof Error ? error : new Error(String(error)));
    return { added: 0, skipped: 0 };
  }
}

/**
 * Sync all news sources
 */
export async function syncAllNews(): Promise<{ api: { added: number; skipped: number }; aaoifi: { added: number; skipped: number } }> {
  const [apiResult, aaoifiResult] = await Promise.all([
    syncNewsFromAPI(),
    syncAAOIFIFatwas(),
  ]);

  return {
    api: apiResult,
    aaoifi: aaoifiResult,
  };
}
