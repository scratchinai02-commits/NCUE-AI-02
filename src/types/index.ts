export type Role = 'student' | 'professor';

export type SkillCategoryId = 'cat1' | 'cat2' | 'cat3' | 'cat4' | 'cat5';

export type CategoryId = 'tools' | 'agents' | 'top5' | SkillCategoryId | 'favorites' | 'all';

export interface Category {
  id: CategoryId;
  name: string;
  badge?: string;
  description: string;
}

export interface SkillLink {
  title: string;
  url: string;
}

export interface Skill {
  id: string;
  cat: SkillCategoryId;
  top?: boolean;
  title: string;
  desc: string;
  prompt: string;
  /** 若此技能需要使用者貼上自己的資料（學生作答、數據、文獻…），在此說明要貼什麼 */
  materialHint?: string;
  video?: string;
  links?: SkillLink[];
  tags?: string[];
}

export interface TeachingContext {
  stage: string;
  subject: string;
  topic: string;
  pedagogies: string[];
  pedagogyCustom: string;
  assessments: string[];
  assessmentCustom: string;
  extra: string;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  stage: string;
  subject: string;
  topic: string;
  pedagogies: string[];
  assessments: string[];
  extra: string;
}

export interface AiStatus {
  /** 後端存在且已設定 API 金鑰 */
  available: boolean;
  model: string;
}
