import type { Role, Skill, TeachingContext } from '../types';

const ROLE_INTRO: Record<Role, string> = {
  student:
    '請擔任具備台灣教育部 108 課綱專業的資深教學輔導專家。我是一位師培生／新手教師，目前正積極準備教學實務與演示。',
  professor:
    '請擔任師資培育審查委員與高等教育教學顧問。我是一位大學師培教授／實習指導教師，目前正在研發師培示範模組、設計評量指標或指導師培生的教學專案。',
};

const ROLE_CLOSING: Record<Role, string> = {
  student: '最後，請用 3 點列出「實際上課（或試教）前的自我檢核提醒」。',
  professor: '最後，請用 3 點列出「指導師培生使用這份成果時，可聚焦的評析與追問重點」。',
};

/** 情境欄位填寫數，用來提示使用者情境是否足夠 */
export function contextCompleteness(ctx: TeachingContext) {
  const filled = [
    ctx.stage.trim(),
    ctx.subject.trim(),
    ctx.topic.trim(),
    ctx.pedagogies.length || ctx.pedagogyCustom.trim(),
    ctx.assessments.length || ctx.assessmentCustom.trim(),
  ].filter(Boolean).length;
  return { filled, total: 5, hasTopic: Boolean(ctx.topic.trim()) };
}

/**
 * 組合最終 Prompt：角色 → 已填寫的情境 → 參考素材 → 任務指令 → 共通輸出要求。
 * 未填寫的欄位不再塞入「[未指定…]」佔位字，而是請 AI 自行合理假設並說明。
 */
export function buildPrompt(role: Role, ctx: TeachingContext, skill: Skill, material = ''): string {
  const pedagogy = [...ctx.pedagogies, ctx.pedagogyCustom.trim()].filter(Boolean).join('、');
  const assessment = [...ctx.assessments, ctx.assessmentCustom.trim()].filter(Boolean).join('、');

  const fields: [string, string][] = [
    ['教育階段', ctx.stage.trim()],
    ['任教科目', ctx.subject.trim()],
    ['單元主題', ctx.topic.trim()],
    ['主要教學法', pedagogy],
    ['評量／作業型態', assessment],
    ['學生狀況與補充需求', ctx.extra.trim()],
  ];
  const provided = fields.filter(([, v]) => v);
  const missing = fields.slice(0, 5).filter(([, v]) => !v).map(([k]) => k);

  const parts: string[] = [ROLE_INTRO[role]];

  if (provided.length) {
    parts.push('目前的教學情境設定如下：\n' + provided.map(([k, v]) => `- ${k}：${v}`).join('\n'));
  }
  if (missing.length) {
    parts.push(
      `（我尚未指定：${missing.join('、')}。請依台灣教學現場最常見的情況合理假設，並在回答開頭用一行列出你的假設。）`,
    );
  }

  const mat = material.trim();
  if (mat) {
    parts.push(`【參考素材】\n"""\n${mat}\n"""`);
  }

  parts.push(`【任務指令】\n${skill.prompt}`);

  parts.push(
    [
      '【輸出要求】',
      '1. 使用臺灣繁體中文與臺灣教育現場用語，以 Markdown 標題、條列與表格呈現，方便直接貼進 Word 或簡報。',
      '2. 涉及課綱條目代碼、法規、研究文獻或統計數據時，若無法確定請標註「（請查證）」，不可自行杜撰。',
      '3. 內容難度與用語須符合上述教育階段與學生狀況。',
      `4. ${ROLE_CLOSING[role]}`,
    ].join('\n'),
  );

  return parts.join('\n\n');
}
