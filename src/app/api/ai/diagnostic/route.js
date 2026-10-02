import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, readingData, listeningData, userAnswers } = await request.json();

    // ─── ACTION: GENERATE ENTRANCE DIAGNOSTIC TEST ───
    if (action === "generate") {
      const system =
        "You are a Cambridge IELTS Senior Examiner and Assessment Specialist. " +
        "Generate an authentic, multi-tier Diagnostic / Placement Test for IELTS Reading & Listening. " +
        "The test is designed to accurately evaluate learners from CEFR A2 up to C1 (Band 4.0 to 8.0+). " +
        "Respond ONLY with valid JSON, no markdown.";

      const prompt = `Create a complete IELTS Diagnostic Entrance Test consisting of:
1. READING TEST (1 Academic Passage ~450-500 words, 10 Questions):
   - Section 1 (Questions 1-4): True/False/Not Given (Testing detail recognition)
   - Section 2 (Questions 5-7): Multiple Choice with 4 options A, B, C, D (Testing inference & main ideas)
   - Section 3 (Questions 8-10): Summary / Sentence Completion, short answer <= 2 words (Testing paraphrase & scanning)
2. LISTENING TEST (1 realistic script ~280-320 words, 8 Questions):
   - Part 1: Everyday conversation or student advisory (~150 words)
   - Part 2: Mini lecture / Academic talk (~150 words)
   - Section 1 (Questions 1-4): Form/Note completion, short answer <= 2 words / numbers
   - Section 2 (Questions 5-8): Multiple Choice with 3 options A, B, C

Return JSON format exactly as follows:
{
  "reading": {
    "title": "Topic title (e.g., Urban Micro-Forests and Climate Resilience)",
    "passage": "Paragraph A\\n\\n[text]\\n\\nParagraph B\\n\\n[text]\\n\\nParagraph C\\n\\n[text]\\n\\nParagraph D\\n\\n[text]",
    "sections": [
      {
        "type": "tfng",
        "instruction": "Questions 1-4: Do the following statements agree with the information given in the passage? Choose TRUE, FALSE, or NOT GIVEN.",
        "questions": [
          { "id": 1, "type": "tfng", "question": "Question 1 text...", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "TRUE", "explanation": "Giải thích chi tiết bằng tiếng Việt..." },
          { "id": 2, "type": "tfng", "question": "Question 2 text...", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "FALSE", "explanation": "Giải thích..." },
          { "id": 3, "type": "tfng", "question": "Question 3 text...", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "NOT GIVEN", "explanation": "Giải thích..." },
          { "id": 4, "type": "tfng", "question": "Question 4 text...", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "TRUE", "explanation": "Giải thích..." }
        ]
      },
      {
        "type": "mcq",
        "instruction": "Questions 5-7: Choose the correct letter, A, B, C or D.",
        "questions": [
          { "id": 5, "type": "mcq", "question": "Question 5 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], "answer": "A. Option 1", "explanation": "Giải thích..." },
          { "id": 6, "type": "mcq", "question": "Question 6 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], "answer": "B. Option 2", "explanation": "Giải thích..." },
          { "id": 7, "type": "mcq", "question": "Question 7 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"], "answer": "C. Option 3", "explanation": "Giải thích..." }
        ]
      },
      {
        "type": "short_answer",
        "instruction": "Questions 8-10: Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
        "questions": [
          { "id": 8, "type": "short_answer", "question": "The primary cause of the phenomenon is __________.", "options": [], "answer": "target words", "explanation": "Giải thích..." },
          { "id": 9, "type": "short_answer", "question": "Experts suggest that __________ should be prioritized.", "options": [], "answer": "target words", "explanation": "Giải thích..." },
          { "id": 10, "type": "short_answer", "question": "A key finding in paragraph D indicates __________.", "options": [], "answer": "target words", "explanation": "Giải thích..." }
        ]
      }
    ]
  },
  "listening": {
    "title": "Diagnostic Listening Session",
    "transcript": "Speaker 1: ...\\n\\nSpeaker 2: ...\\n\\nLecturer: ...",
    "sections": [
      {
        "type": "short_answer",
        "instruction": "Questions 1-4: Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
        "questions": [
          { "id": 1, "type": "short_answer", "question": "Student ID: __________", "options": [], "answer": "ST9420", "explanation": "Giải thích..." },
          { "id": 2, "type": "short_answer", "question": "Preferred course start date: __________", "options": [], "answer": "15 October", "explanation": "Giải thích..." },
          { "id": 3, "type": "short_answer", "question": "Main contact method: __________", "options": [], "answer": "email", "explanation": "Giải thích..." },
          { "id": 4, "type": "short_answer", "question": "Total registration fee: $__________", "options": [], "answer": "120", "explanation": "Giải thích..." }
        ]
      },
      {
        "type": "mcq",
        "instruction": "Questions 5-8: Choose the correct letter, A, B or C.",
        "questions": [
          { "id": 5, "type": "mcq", "question": "Question 5 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3"], "answer": "A. Option 1", "explanation": "Giải thích..." },
          { "id": 6, "type": "mcq", "question": "Question 6 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3"], "answer": "B. Option 2", "explanation": "Giải thích..." },
          { "id": 7, "type": "mcq", "question": "Question 7 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3"], "answer": "C. Option 3", "explanation": "Giải thích..." },
          { "id": 8, "type": "mcq", "question": "Question 8 text...", "options": ["A. Option 1", "B. Option 2", "C. Option 3"], "answer": "A. Option 1", "explanation": "Giải thích..." }
        ]
      }
    ]
  }
}`;

      const testContent = await askAI(system, prompt, { maxTokens: 4000 });
      if (testContent && testContent.reading && testContent.listening) {
        return Response.json(testContent);
      }

      // Robust fallback test data (Authentic Cambridge IELTS Standard)
      const fallbackTest = {
        reading: {
          title: "The Science of Urban Micro-Forests",
          passage:
            "Paragraph A\nIn recent years, urban planners and environmental scientists have increasingly turned to 'micro-forests'—dense, pocket-sized woodlands planted in the hearts of crowded cities. Pioneer botanist Akira Miyawaki developed a method in the 1970s that involves planting native species in close proximity to encourage rapid growth through natural competition for sunlight. Today, these miniature ecosystems are proving to be powerful tools in fighting the urban heat island effect, where concrete and asphalt trap heat, raising city temperatures significantly above surrounding rural areas.\n\n" +
            "Paragraph B\nUnlike conventional municipal parks, which typically feature manicured lawns and scattered ornamental trees, micro-forests mimic the multi-layered canopy of primary forests. They consist of ground shrubs, sub-trees, and canopy trees planted together at densities of up to three trees per square meter. Research indicates that micro-forests can grow up to ten times faster, support twenty times more biodiversity, and absorb up to thirty times more carbon dioxide than monoculture urban landscapes.\n\n" +
            "Paragraph C\nBeyond temperature reduction and carbon sequestration, micro-forests serve as vital acoustic buffers and water-management systems. In Tokyo and Paris, dense greenery along transit corridors has reduced ambient street noise by as much as eight decibels. Furthermore, the deeply interwoven root systems improve soil porosity, allowing up to forty percent more rainwater absorption during torrential storms, thereby mitigating urban flooding risks.\n\n" +
            "Paragraph D\nDespite their undeniable ecological benefits, implementing micro-forests presents certain logistical hurdles. Initial installation requires thorough soil remediation, as urban grounds are frequently contaminated with industrial residues or compacted by heavy machinery. Additionally, the intensive initial maintenance phase demands dedicated irrigation for the first two years before the miniature ecosystem becomes fully self-sustaining. Nevertheless, hundreds of cities across Europe and Asia are now integrating micro-forests into their climate resilience master plans.",
          sections: [
            {
              type: "tfng",
              instruction: "Questions 1-4: Do the following statements agree with the information given in the passage? Choose TRUE, FALSE, or NOT GIVEN.",
              questions: [
                {
                  id: 1,
                  type: "tfng",
                  question: "Akira Miyawaki's planting technique involves grouping non-native trees together.",
                  options: ["TRUE", "FALSE", "NOT GIVEN"],
                  answer: "FALSE",
                  explanation: "Đoạn A nêu rõ phương pháp này trồng các loài bản địa (native species), không phải non-native."
                },
                {
                  id: 2,
                  type: "tfng",
                  question: "Micro-forests can help lower temperatures in urban heat islands.",
                  options: ["TRUE", "FALSE", "NOT GIVEN"],
                  answer: "TRUE",
                  explanation: "Đoạn A xác nhận: 'these miniature ecosystems are proving to be powerful tools in fighting the urban heat island effect'."
                },
                {
                  id: 3,
                  type: "tfng",
                  question: "Conventional parks require higher financial investments than micro-forests.",
                  options: ["TRUE", "FALSE", "NOT GIVEN"],
                  answer: "NOT GIVEN",
                  explanation: "Bài đọc so sánh tốc độ lớn và đa dạng sinh học ở đoạn B, nhưng không hề đề cập đến chi phí tài chính (financial investments)."
                },
                {
                  id: 4,
                  type: "tfng",
                  question: "Micro-forests absorb more rainwater than standard lawns due to deep root networks.",
                  options: ["TRUE", "FALSE", "NOT GIVEN"],
                  answer: "TRUE",
                  explanation: "Đoạn C chỉ ra rằng hệ thống rễ đan xen giúp hấp thụ nhiều hơn tới 40% nước mưa."
                }
              ]
            },
            {
              type: "mcq",
              instruction: "Questions 5-7: Choose the correct letter, A, B, C or D.",
              questions: [
                {
                  id: 5,
                  type: "mcq",
                  question: "According to Paragraph B, micro-forests differ from traditional parks because they...",
                  options: [
                    "A. feature manicured lawns and single tree species",
                    "B. replicate the layered structure of natural virgin forests",
                    "C. require less planting density per square meter",
                    "D. take ten times longer to grow fully"
                  ],
                  answer: "B. replicate the layered structure of natural virgin forests",
                  explanation: "Đoạn B nêu 'micro-forests mimic the multi-layered canopy of primary forests'."
                },
                {
                  id: 6,
                  type: "mcq",
                  question: "What is mentioned about sound reduction in Tokyo and Paris?",
                  options: [
                    "A. It was achieved by building acoustic barriers along railways",
                    "B. Street noise dropped by up to eight decibels along transit corridors",
                    "C. It completely eliminated high-frequency traffic sounds",
                    "D. It required more than ten years of growth to take effect"
                  ],
                  answer: "B. Street noise dropped by up to eight decibels along transit corridors",
                  explanation: "Đoạn C viết: 'dense greenery along transit corridors has reduced ambient street noise by as much as eight decibels'."
                },
                {
                  id: 7,
                  type: "mcq",
                  question: "Which of the following is identified as a challenge when establishing a micro-forest?",
                  options: [
                    "A. Extreme scarcity of native seeds in urban zones",
                    "B. Excessive long-term water consumption after five years",
                    "C. The requirement to treat and prepare contaminated urban soil",
                    "D. Opposition from European and Asian city governments"
                  ],
                  answer: "C. The requirement to treat and prepare contaminated urban soil",
                  explanation: "Đoạn D nêu: 'Initial installation requires thorough soil remediation, as urban grounds are frequently contaminated'."
                }
              ]
            },
            {
              type: "short_answer",
              instruction: "Questions 8-10: Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
              questions: [
                {
                  id: 8,
                  type: "short_answer",
                  question: "Rapid tree development in micro-forests is stimulated by natural __________ for light.",
                  options: [],
                  answer: "competition",
                  explanation: "Đoạn A: 'encourage rapid growth through natural competition for sunlight'."
                },
                {
                  id: 9,
                  type: "short_answer",
                  question: "Roots enhance soil __________ to increase rainwater intake during storms.",
                  options: [],
                  answer: "porosity",
                  explanation: "Đoạn C: 'improve soil porosity, allowing up to forty percent more rainwater absorption'."
                },
                {
                  id: 10,
                  type: "short_answer",
                  question: "Micro-forests generally require artificial irrigation for the first __________.",
                  options: [],
                  answer: "two years",
                  explanation: "Đoạn D: 'demands dedicated irrigation for the first two years'."
                }
              ]
            }
          ]
        },
        listening: {
          title: "University Environmental Club Advisory & Lecture",
          transcript:
            "Advisor: Good morning, welcome to the Student Sustainability Centre. How can I assist you with your campus registration today?\n" +
            "Student: Hi! I would like to join the Green Campus Initiative and sign up for the weekly tree nursery workshop.\n" +
            "Advisor: Excellent. First, I need your student ID number, please.\n" +
            "Student: Sure, it is ST9420.\n" +
            "Advisor: And which faculty are you in?\n" +
            "Student: I am currently studying in the Department of Architecture.\n" +
            "Advisor: Great. The introductory orientation will take place on the 15th of October at the Central Quadrangle. There is a nominal equipment fee of twenty-five dollars for safety gear.\n" +
            "Student: Perfect. What is the most reliable way to receive project updates?\n" +
            "Advisor: We send all scheduling announcements directly via our mobile app, so please make sure you download it after registration.\n\n" +
            "Lecturer: Now moving to our second topic today: Urban Biodiversity Corridors. When designing wildlife corridors in metropolitan areas, landscape architects must prioritize habitat connectivity over sheer aesthetic appeal. Continuous green corridors allow avian species and small mammals to migrate between fragmented parklands safely. The primary obstacle remains road crossings, which can be mitigated through canopy bridges or underpasses.",
          sections: [
            {
              type: "short_answer",
              instruction: "Questions 1-4: Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
              questions: [
                {
                  id: 1,
                  type: "short_answer",
                  question: "Student ID Number: __________",
                  options: [],
                  answer: "ST9420",
                  explanation: "Student nói: 'Sure, it is ST9420'."
                },
                {
                  id: 2,
                  type: "short_answer",
                  question: "Orientation date: __________",
                  options: [],
                  answer: "15 October",
                  explanation: "Advisor thông báo: 'take place on the 15th of October'."
                },
                {
                  id: 3,
                  type: "short_answer",
                  question: "Equipment fee: $__________",
                  options: [],
                  answer: "25",
                  explanation: "Advisor thông báo: 'nominal equipment fee of twenty-five dollars'."
                },
                {
                  id: 4,
                  type: "short_answer",
                  question: "Main channel for project updates: __________",
                  options: [],
                  answer: "mobile app",
                  explanation: "Advisor chỉ định: 'directly via our mobile app'."
                }
              ]
            },
            {
              type: "mcq",
              instruction: "Questions 5-8: Choose the correct letter, A, B or C.",
              questions: [
                {
                  id: 5,
                  type: "mcq",
                  question: "Which department is the student currently enrolled in?",
                  options: ["A. Department of Biology", "B. Department of Architecture", "C. Department of Forestry"],
                  answer: "B. Department of Architecture",
                  explanation: "Học sinh nói: 'Department of Architecture'."
                },
                {
                  id: 6,
                  type: "mcq",
                  question: "Where will the orientation session be held?",
                  options: ["A. Central Quadrangle", "B. Main Library", "C. Student Union Hall"],
                  answer: "A. Central Quadrangle",
                  explanation: "Advisor nói: 'at the Central Quadrangle'."
                },
                {
                  id: 7,
                  type: "mcq",
                  question: "According to the lecturer, what should urban designers prioritize?",
                  options: [
                    "A. Decorative aesthetic appeal",
                    "B. Habitat connectivity between green spaces",
                    "C. Minimizing tree density in corridors"
                  ],
                  answer: "B. Habitat connectivity between green spaces",
                  explanation: "Lecturer nhấn mạnh: 'must prioritize habitat connectivity over sheer aesthetic appeal'."
                },
                {
                  id: 8,
                  type: "mcq",
                  question: "What is mentioned as a solution for road crossings in wildlife corridors?",
                  options: [
                    "A. Underground pedestrian tunnels only",
                    "B. Canopy bridges and underpasses",
                    "C. High-speed traffic warning sirens"
                  ],
                  answer: "B. Canopy bridges and underpasses",
                  explanation: "Lecturer nói: 'mitigated through canopy bridges or underpasses'."
                }
              ]
            }
          ]
        }
      };

      return Response.json(fallbackTest);
    }


    // ─── ACTION: EVALUATE & DIAGNOSE ───
    if (action === "evaluate") {
      const { readingAnswers = {}, listeningAnswers = {}, testData } = userAnswers;

      // Extract all reading questions
      const rQuestions = [];
      (testData.reading?.sections || []).forEach((sec) => {
        (sec.questions || []).forEach((q) => rQuestions.push(q));
      });

      // Extract all listening questions
      const lQuestions = [];
      (testData.listening?.sections || []).forEach((sec) => {
        (sec.questions || []).forEach((q) => lQuestions.push(q));
      });

      // Grade Reading
      let rCorrect = 0;
      const rDetails = rQuestions.map((q) => {
        const uAns = (readingAnswers[q.id] || "").trim().toLowerCase();
        const cAns = (q.answer || "").trim().toLowerCase();
        let isCorrect = false;

        if (q.type === "mcq" || q.type === "tfng") {
          isCorrect = uAns === cAns || (uAns.length > 0 && cAns.startsWith(uAns[0]));
        } else {
          isCorrect = uAns === cAns || (uAns.length > 0 && cAns.includes(uAns));
        }

        if (isCorrect) rCorrect++;
        return {
          id: q.id,
          userAnswer: readingAnswers[q.id] || "(Chưa trả lời)",
          correctAnswer: q.answer,
          isCorrect,
          explanation: q.explanation,
        };
      });

      // Grade Listening
      let lCorrect = 0;
      const lDetails = lQuestions.map((q) => {
        const uAns = (listeningAnswers[q.id] || "").trim().toLowerCase();
        const cAns = (q.answer || "").trim().toLowerCase();
        let isCorrect = false;

        if (q.type === "mcq") {
          isCorrect = uAns === cAns || (uAns.length > 0 && cAns.startsWith(uAns[0]));
        } else {
          isCorrect = uAns === cAns || (uAns.length > 0 && cAns.includes(uAns));
        }

        if (isCorrect) lCorrect++;
        return {
          id: q.id,
          userAnswer: listeningAnswers[q.id] || "(Chưa trả lời)",
          correctAnswer: q.answer,
          isCorrect,
          explanation: q.explanation,
        };
      });

      // Calculate raw Band scores
      // Reading: 10 questions
      const calcRBand = (c) => {
        if (c >= 10) return 8.5;
        if (c === 9) return 8.0;
        if (c === 8) return 7.5;
        if (c === 7) return 7.0;
        if (c === 6) return 6.0;
        if (c === 5) return 5.5;
        if (c === 4) return 5.0;
        if (c === 3) return 4.5;
        if (c === 2) return 4.0;
        return 3.5;
      };

      // Listening: 8 questions
      const calcLBand = (c) => {
        if (c >= 8) return 8.5;
        if (c === 7) return 7.5;
        if (c === 6) return 7.0;
        if (c === 5) return 6.0;
        if (c === 4) return 5.5;
        if (c === 3) return 5.0;
        if (c === 2) return 4.5;
        if (c === 1) return 4.0;
        return 3.5;
      };

      const readingBand = calcRBand(rCorrect);
      const listeningBand = calcLBand(lCorrect);
      const overallBand = Math.round(((readingBand + listeningBand) / 2) * 2) / 2;

      // Ask AI for detailed diagnostic report and personalized study plan
      const evalSystem =
        "You are an expert Cambridge IELTS Academic Director. Analyze the learner's diagnostic entrance test results and produce a detailed evaluation with clear strengths, weaknesses, and a personalized study roadmap in Vietnamese. Respond ONLY with valid JSON.";

      const evalPrompt = `Diagnostic Assessment Results:
- Reading: ${rCorrect}/${rQuestions.length} correct (Band: ${readingBand})
- Listening: ${lCorrect}/${lQuestions.length} correct (Band: ${listeningBand})
- Overall Estimated Band: ${overallBand}

Reading Questions Breakdown:
${JSON.stringify(rDetails.map((d) => ({ id: d.id, isCorrect: d.isCorrect, userAns: d.userAnswer, correctAns: d.correctAnswer })))}

Listening Questions Breakdown:
${JSON.stringify(lDetails.map((d) => ({ id: d.id, isCorrect: d.isCorrect, userAns: d.userAnswer, correctAns: d.correctAnswer })))}

Provide in JSON format:
{
  "cefr_level": "B2 - Upper-Intermediate",
  "summary_feedback": "Nhận xét tổng quát năng lực ngôn ngữ và phản xạ của học viên...",
  "strengths": [
    "Khả năng bắt từ khóa số liệu trong bài nghe tốt",
    "Khả năng nắm ý chính đoạn văn tốt"
  ],
  "weaknesses": [
    "Dễ bị bẫy ở dạng câu hỏi True/False/Not Given",
    "Kỹ năng paraphrase từ đồng nghĩa cần cải thiện"
  ],
  "study_roadmap": [
    {
      "step": 1,
      "title": "Củng cố nền từ vựng học thuật (Academic Word List)",
      "action": "Học 15 từ vựng mỗi ngày trên hệ thống Spaced Repetition (SM-2)",
      "target_skill": "Vocabulary"
    },
    {
      "step": 2,
      "title": "Chinh phục dạng bài True/False/Not Given",
      "action": "Thực hành 2 bài Reading Test chuyên sâu mỗi tuần tập trung vào kỹ năng phân biệt False vs Not Given",
      "target_skill": "Reading"
    },
    {
      "step": 3,
      "title": "Luyện phản xạ nghe chi tiết",
      "action": "Luyện Shadowing và Listening Test 3 buổi/tuần với tốc độ 1.0x - 1.2x",
      "target_skill": "Listening"
    },
    {
      "step": 4,
      "title": "Mục tiêu nâng Band trong 60 ngày",
      "action": "Nâng từ Band ${overallBand} lên Band ${Math.min(9.0, overallBand + 1.0)}",
      "target_skill": "Milestone"
    }
  ]
}`;

      const aiAnalysis = await askAI(evalSystem, evalPrompt);

      return Response.json({
        reading_score: rCorrect,
        reading_total: rQuestions.length,
        reading_band: readingBand,
        reading_details: rDetails,
        listening_score: lCorrect,
        listening_total: lQuestions.length,
        listening_band: listeningBand,
        listening_details: lDetails,
        estimated_band: overallBand,
        cefr_level: aiAnalysis?.cefr_level || (overallBand >= 7 ? "C1" : overallBand >= 5.5 ? "B2" : "B1"),
        summary_feedback: aiAnalysis?.summary_feedback || "Hoàn thành bài kiểm tra đầu vào.",
        strengths: aiAnalysis?.strengths || [],
        weaknesses: aiAnalysis?.weaknesses || [],
        study_roadmap: aiAnalysis?.study_roadmap || [],
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Diagnostic API error:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
