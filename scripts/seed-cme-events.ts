import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), "dev.db");
const adapter = new PrismaBetterSqlite3({ url: DB_PATH });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Skip if events already exist
  const existingCount = await prisma.cmeEvent.count();
  if (existingCount > 0) {
    console.log(`⏭️  CME events already seeded (${existingCount} events). Skipping.`);
    return;
  }

  console.log("🎓 Seeding CME events...");

  // Create speakers first
  const speakers = await Promise.all([
    prisma.cmeSpeaker.create({
      data: {
        name: "Dr. Ramesh Varier",
        email: "ramesh.varier@ayurveda.edu",
        title: "BAMS, MD (Ay)",
        designation: "Professor & HOD",
        organization: "Kerala Ayurveda University",
        bio: "30+ years in Panchakarma therapy and clinical research. Published over 50 papers in peer-reviewed journals.",
        specializations: JSON.stringify(["Panchakarma", "Kayachikitsa", "Clinical Research"]),
      },
    }),
    prisma.cmeSpeaker.create({
      data: {
        name: "Dr. Lakshmi Nair",
        email: "lakshmi.nair@wellness.sg",
        title: "BAMS, MSc Yoga",
        designation: "Director",
        organization: "Singapore Ayurveda Centre",
        bio: "Pioneer of Ayurveda integration in Southeast Asia. Expert in Rasayana therapy and preventive medicine.",
        specializations: JSON.stringify(["Rasayana", "Preventive Medicine", "Yoga Therapy"]),
      },
    }),
    prisma.cmeSpeaker.create({
      data: {
        name: "Dr. Suresh Menon",
        email: "suresh.menon@ayu.in",
        title: "BAMS, PhD",
        designation: "Research Director",
        organization: "National Ayurveda Research Institute",
        bio: "Leading researcher in evidence-based Ayurveda. Specializes in Dravyaguna and pharmacology.",
        specializations: JSON.stringify(["Dravyaguna", "Pharmacology", "Research Methodology"]),
      },
    }),
    prisma.cmeSpeaker.create({
      data: {
        name: "Dr. Anitha Krishnan",
        email: "anitha.k@herbmed.org",
        title: "BAMS, MD (Ay), PGDHR",
        designation: "Senior Consultant",
        organization: "Arya Vaidya Pharmacy",
        bio: "Expert in Stree Roga and Prasuti Tantra with 20 years of clinical practice.",
        specializations: JSON.stringify(["Stree Roga", "Prasuti Tantra", "Women's Health"]),
      },
    }),
  ]);

  // Create events across all categories
  const now = new Date();
  const events = [
    // CME Events
    {
      slug: "panchakarma-masterclass-2026",
      title: "Advanced Panchakarma Techniques — CME Masterclass",
      subtitle: "Hands-on clinical training with live demonstrations",
      description: "A comprehensive 2-day CME program covering advanced Panchakarma procedures including Vamana, Virechana, Basti, Nasya, and Raktamokshana. Includes live patient demonstrations, case discussions, and evidence-based protocol development. Earn 12 CME credits accredited by CCIM.",
      shortDescription: "Advanced Panchakarma hands-on training with 12 CME credits. Live demos & case discussions.",
      category: "cme",
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      endDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
      mode: "hybrid",
      venue: "AyurGate Training Centre",
      venueAddress: "45 Serangoon Road, Singapore 217959",
      cmeCredits: 12,
      cmeAccreditor: "CCIM - Central Council of Indian Medicine",
      maxAttendees: 60,
      registrationFee: 250,
      currency: "SGD",
      earlyBirdFee: 180,
      earlyBirdDeadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: "published",
      isPublic: true,
      isFeatured: true,
      tags: JSON.stringify(["panchakarma", "clinical", "hands-on", "cme-credits"]),
    },
    {
      slug: "ayurveda-dermatology-cme-2026",
      title: "Ayurvedic Dermatology — Skin Disorders & Treatments",
      subtitle: "CME program on Kushtha Chikitsa",
      description: "Focused CME session on Ayurvedic management of common and complex skin disorders. Covers Kushtha classification, Shodhana & Shamana protocols, external applications (Lepas), and integration with modern dermatology diagnostics. Case presentations from practicing physicians.",
      shortDescription: "CME on Ayurvedic dermatology — Kushtha management, Lepa therapy & modern integration.",
      category: "cme",
      startDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      mode: "online",
      platformType: "zoom",
      cmeCredits: 6,
      cmeAccreditor: "CCIM",
      maxAttendees: 200,
      registrationFee: 75,
      currency: "SGD",
      status: "published",
      isPublic: true,
      isFeatured: false,
      tags: JSON.stringify(["dermatology", "kushtha", "skin-disorders", "cme-credits"]),
    },

    // Webinars
    {
      slug: "rasayana-immunity-webinar",
      title: "Rasayana Therapy for Modern Immunity Challenges",
      subtitle: "Free webinar on immune-boosting Ayurvedic protocols",
      description: "Join Dr. Lakshmi Nair for an insightful webinar on how classical Rasayana formulations can address modern immunity challenges. Topics include Chyawanprash variants, Ashwagandha protocols, gut-immunity connection in Ayurveda, and practical daily Dinacharya routines for immune resilience.",
      shortDescription: "Free webinar on Rasayana for immunity — classical formulations meets modern challenges.",
      category: "webinar",
      startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
      endDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      mode: "online",
      platformType: "zoom",
      cmeCredits: 2,
      maxAttendees: 500,
      registrationFee: 0,
      currency: "SGD",
      status: "published",
      isPublic: true,
      isFeatured: true,
      tags: JSON.stringify(["rasayana", "immunity", "free", "webinar"]),
    },
    {
      slug: "pulse-diagnosis-webinar-series",
      title: "Nadi Pariksha — Pulse Diagnosis Webinar Series (Part 3)",
      subtitle: "Advanced pulse reading for Tridosha assessment",
      description: "Part 3 of our popular webinar series on Nadi Pariksha. This session covers advanced pulse reading techniques for assessing Samdosha (combined dosha) imbalances, Ojas assessment, and Sara Pariksha through pulse. Includes interactive Q&A and pulse-reading practice guidance.",
      shortDescription: "Advanced pulse diagnosis techniques — Tridosha assessment & Ojas evaluation.",
      category: "webinar",
      startDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      mode: "online",
      platformType: "youtube_live",
      cmeCredits: 1.5,
      maxAttendees: 1000,
      registrationFee: 15,
      currency: "SGD",
      status: "published",
      isPublic: true,
      tags: JSON.stringify(["nadi-pariksha", "pulse-diagnosis", "series", "tridosha"]),
    },

    // Workshops
    {
      slug: "herbal-formulation-workshop-2026",
      title: "Herbal Medicine Formulation — Practical Workshop",
      subtitle: "Learn to prepare classical Ayurvedic formulations",
      description: "A hands-on workshop covering preparation of key Ayurvedic formulations: Kashaya (decoctions), Churna (powders), Ghrita (medicated ghee), Taila (medicated oils), and Asava-Arishta (fermented preparations). Participants will prepare formulations under expert guidance and take home their preparations.",
      shortDescription: "Hands-on herbal formulation workshop — prepare classical medicines yourself.",
      category: "workshop",
      startDate: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
      mode: "in_person",
      venue: "Herb Garden & Lab, AyurGate Centre",
      venueAddress: "45 Serangoon Road, Singapore 217959",
      cmeCredits: 8,
      maxAttendees: 25,
      registrationFee: 350,
      currency: "SGD",
      earlyBirdFee: 280,
      earlyBirdDeadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: "published",
      isPublic: true,
      isFeatured: true,
      tags: JSON.stringify(["herbal", "formulation", "hands-on", "workshop"]),
    },
    {
      slug: "marma-therapy-intensive",
      title: "Marma Therapy Intensive — Weekend Workshop",
      subtitle: "Clinical Marma points for pain management",
      description: "Two-day intensive workshop on therapeutic Marma point stimulation for pain management and musculoskeletal disorders. Learn 32 key Marma points, pressure techniques, contraindications, and integration with Panchakarma. Includes practice on peers and anatomical models.",
      shortDescription: "Weekend Marma therapy workshop — 32 key points for pain management.",
      category: "workshop",
      startDate: new Date(now.getTime() + 35 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 36 * 24 * 60 * 60 * 1000),
      mode: "in_person",
      venue: "AyurGate Training Centre",
      venueAddress: "45 Serangoon Road, Singapore 217959",
      cmeCredits: 10,
      maxAttendees: 20,
      registrationFee: 450,
      currency: "SGD",
      status: "published",
      isPublic: true,
      tags: JSON.stringify(["marma", "pain-management", "intensive", "hands-on"]),
    },

    // Conferences
    {
      slug: "ayurveda-global-summit-2026",
      title: "AyurGate Global Ayurveda Summit 2026",
      subtitle: "Bridging Traditional Wisdom & Modern Healthcare",
      description: "The premier annual conference bringing together Ayurveda practitioners, researchers, and wellness leaders from across the globe. Featuring 20+ speaker sessions, panel discussions, poster presentations, and networking events. Topics span clinical practice, research, digital health, regulatory affairs, and global standardization of Ayurveda practice.",
      shortDescription: "Annual global Ayurveda conference — 20+ speakers, research, clinical practice & networking.",
      category: "conference",
      startDate: new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 62 * 24 * 60 * 60 * 1000), // 3-day event
      mode: "hybrid",
      venue: "Marina Bay Sands Convention Centre",
      venueAddress: "10 Bayfront Avenue, Singapore 018956",
      cmeCredits: 20,
      cmeAccreditor: "CCIM & WHO Traditional Medicine Division",
      maxAttendees: 500,
      registrationFee: 500,
      currency: "SGD",
      earlyBirdFee: 350,
      earlyBirdDeadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      status: "published",
      isPublic: true,
      isFeatured: true,
      tags: JSON.stringify(["global", "summit", "conference", "research", "networking"]),
    },
    {
      slug: "integrative-medicine-conference-sg",
      title: "Integrative Medicine Conference — Singapore 2026",
      subtitle: "Where Ayurveda meets modern evidence-based practice",
      description: "A multi-disciplinary conference exploring the integration of Ayurveda with conventional medicine. Sessions cover clinical trial design for herbal medicine, regulatory pathways in ASEAN, hospital-based integrative programs, and patient safety frameworks. Features keynotes from both Ayurveda and allopathic medical leaders.",
      shortDescription: "Multi-disciplinary conference on Ayurveda-modern medicine integration.",
      category: "conference",
      startDate: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 91 * 24 * 60 * 60 * 1000),
      mode: "in_person",
      venue: "Suntec Convention Centre",
      venueAddress: "1 Raffles Boulevard, Singapore 039593",
      cmeCredits: 14,
      cmeAccreditor: "Singapore Medical Council",
      maxAttendees: 300,
      registrationFee: 400,
      currency: "SGD",
      status: "published",
      isPublic: true,
      tags: JSON.stringify(["integrative", "evidence-based", "multi-disciplinary", "conference"]),
    },
  ];

  for (const eventData of events) {
    const event = await prisma.cmeEvent.create({ data: eventData });
    console.log(`  Created: [${event.category}] ${event.title}`);

    // Assign 1-2 speakers to each event
    const speakerIndices = eventData.category === "conference"
      ? [0, 1, 2, 3]  // conferences get all speakers
      : eventData.category === "workshop"
      ? [0, 2]
      : [Math.floor(Math.random() * speakers.length)];

    for (let i = 0; i < speakerIndices.length; i++) {
      await prisma.cmeEventSpeaker.create({
        data: {
          eventId: event.id,
          speakerId: speakers[speakerIndices[i]].id,
          role: i === 0 ? "speaker" : i === 1 ? "moderator" : "panelist",
          sortOrder: i,
        },
      });
    }
  }

  console.log(`\nSeeded ${events.length} CME events and ${speakers.length} speakers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
