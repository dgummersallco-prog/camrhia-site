// Default questionnaire questions, seeded once per photographer per session type.
// Shared between the questionnaire editor (manual editing) and signup (auto-seeding
// every session type immediately, so nothing has to be "activated" one by one).

export interface QuestionDefault {
  section: string;
  prompt: string;
  hint: string | null;
  sort_order: number;
}

export const WEDDING_DEFAULTS: QuestionDefault[] = [
  // Logistics
  { section: 'Logistics', prompt: "When exactly does your ceremony start — date and time?",                                  hint: null, sort_order: 0  },
  { section: 'Logistics', prompt: "Where will you each be getting ready? Include the address (and both locations if you're getting ready separately).", hint: null, sort_order: 1  },
  { section: 'Logistics', prompt: "What's the name and full address of your ceremony venue?",                                 hint: null, sort_order: 2  },
  { section: 'Logistics', prompt: "If your reception is somewhere else, what's the venue name and address?",                  hint: null, sort_order: 3  },
  { section: 'Logistics', prompt: "Can you walk us through a rough timeline for the day, from getting ready to send-off?",    hint: null, sort_order: 4  },
  { section: 'Logistics', prompt: "Does your venue have any photography rules or restrictions we should plan around?",        hint: null, sort_order: 5  },
  // People
  { section: 'People',    prompt: "Do you have a wedding planner or coordinator? If so, what's their name and phone number?", hint: null, sort_order: 6  },
  { section: 'People',    prompt: "Who are your other vendors — DJ, florist, videographer, etc. — and how can we reach them?", hint: null, sort_order: 7  },
  { section: 'People',    prompt: "Who's in your wedding party, and what role does each person have?",                        hint: null, sort_order: 8  },
  { section: 'People',    prompt: "Who should be included in formal family portraits? Names and how they're related to you both.", hint: null, sort_order: 9  },
  // Your photos
  { section: 'Your photos', prompt: "Are there any must-have shots or moments you don't want us to miss?",                    hint: null, sort_order: 10 },
  { section: 'Your photos', prompt: "What family or group photo combinations would you like? Feel free to list each grouping.", hint: null, sort_order: 11 },
  { section: 'Your photos', prompt: "Any specific poses or Pinterest inspiration you'd love us to recreate?",                 hint: null, sort_order: 12 },
  { section: 'Your photos', prompt: "Which little details matter most to you — rings, dress, invitations, decor?",            hint: null, sort_order: 13 },
  // The human stuff
  { section: 'The human stuff', prompt: "Is there anything about your family dynamics — divorced parents, blended families, estrangement — we should be mindful of?", hint: null, sort_order: 14 },
  { section: 'The human stuff', prompt: "Is there anyone you'd like to honor who's passed away, or any memorial moments we should plan for?", hint: null, sort_order: 15 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?",         hint: null, sort_order: 16 },
  { section: 'The human stuff', prompt: "Is there anything unconventional about your day, or anything else you think we should know?", hint: null, sort_order: 17 },
];

export const ENGAGEMENT_DEFAULTS: QuestionDefault[] = [
  // Logistics
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a location in mind, or would you like a recommendation? Include the address if you already have one.", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "Is there a backup plan in case the weather doesn't cooperate?", hint: null, sort_order: 2 },
  // Details
  { section: 'Details', prompt: "Will anyone be joining you for part of the session — a pet, family, or a proposal-style moment?", hint: null, sort_order: 3 },
  { section: 'Details', prompt: "How many outfit changes are you planning, and what's the general style or color palette?", hint: null, sort_order: 4 },
  { section: 'Details', prompt: "Any props or meaningful details you'd like included?", hint: null, sort_order: 5 },
  // Your photos
  { section: 'Your photos', prompt: "Are there any must-have shots or poses you're hoping for?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 7 },
  // The human stuff
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 8 },
  { section: 'The human stuff', prompt: "What's your story? How did you two meet, and what do you love most about each other?", hint: null, sort_order: 9 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 10 },
];

export const PROPOSAL_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When and where is the proposal planned? (We'll keep all details completely confidential.)", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a specific hiding spot or vantage point in mind for us, or would you like recommendations?", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "Is there a backup plan in case of bad weather?", hint: null, sort_order: 2 },
  { section: 'Secrecy & plan', prompt: "Walk us through your plan — where will you be positioned when the proposal happens, and what's the general timeline?", hint: null, sort_order: 3 },
  { section: 'Secrecy & plan', prompt: "Does your partner know you'll have a photographer there, or is this a total surprise?", hint: null, sort_order: 4 },
  { section: 'Secrecy & plan', prompt: "Is anyone else in on the secret — family, friends — who might be nearby or need coordinating?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Are there any must-have shots you're hoping for — the ring, the reaction, a specific angle?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "What's your story? How did you two meet, and what do you love most about each other?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before the big moment?", hint: null, sort_order: 8 },
];

export const MATERNITY_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session? Most maternity sessions happen between 28-36 weeks — do you have a due date in mind?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a location in mind — studio, outdoors, or at home? Include the address if you already have one.", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "Is there a backup plan in case the weather doesn't cooperate?", hint: null, sort_order: 2 },
  { section: 'Details', prompt: "Will anyone be joining you for part of the session — your partner, other children, a pet?", hint: null, sort_order: 3 },
  { section: 'Details', prompt: "Do you have an outfit in mind, or would you like to borrow from a maternity wardrobe if available?", hint: null, sort_order: 4 },
  { section: 'Details', prompt: "Any props or meaningful details you'd like included — an ultrasound photo, baby shoes, a sign with the due date?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Are there any must-have shots or poses you're hoping for?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 8 },
  { section: 'The human stuff', prompt: "Is this your first pregnancy, or do you have other children we should know about?", hint: null, sort_order: 9 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 10 },
];

export const NEWBORN_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "What's your baby's due date or birth date? Newborn sessions are best within the first 1-2 weeks.", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Where would you like the session — in your home, or at our studio?", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "Is your home comfortable and warm enough for a relaxed, unhurried session? Newborns do best warm and sleepy.", hint: null, sort_order: 2 },
  { section: 'Baby & family', prompt: "What's your baby's name, and do you have any nicknames you'd like included?", hint: null, sort_order: 3 },
  { section: 'Baby & family', prompt: "Will siblings, parents, grandparents, or pets be joining for part of the session?", hint: null, sort_order: 4 },
  { section: 'Baby & family', prompt: "Any family heirlooms, blankets, or meaningful props you'd like included?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Are there any must-have shots or poses you're hoping for?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything about your baby's health or temperament we should be mindful of during the session?", hint: null, sort_order: 8 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 9 },
];

export const FAMILY_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a location in mind, or would you like a recommendation?", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "Is there a backup plan in case the weather doesn't cooperate?", hint: null, sort_order: 2 },
  { section: 'People', prompt: "Who will be joining the session? Please list names and ages of everyone, including pets.", hint: null, sort_order: 3 },
  { section: 'People', prompt: "Is anyone in the group camera-shy, or is there a young child who might need a little extra patience?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Are there any must-have combinations you'd like — the whole group, just the kids, grandparents, etc.?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "What's the general style or color palette you're planning for outfits?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "How does your family feel in front of the camera — any wigglers, camera-shy members, or anyone we should be mindful of?", hint: null, sort_order: 8 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 9 },
];

export const SENIOR_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a location — or a few — in mind? School, a favorite spot, downtown, nature?", hint: null, sort_order: 1 },
  { section: 'Logistics', prompt: "How many outfit changes are you planning?", hint: null, sort_order: 2 },
  { section: 'Your look', prompt: "What's your personal style — classic, trendy, sporty, artsy? Any specific outfits or colors you're planning?", hint: null, sort_order: 3 },
  { section: 'Your look', prompt: "Do you want to include your school colors, mascot, or letterman jacket in any shots?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Are there any must-have shots or poses you're hoping for?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Do you want any shots with your car, sport, instrument, or a hobby that represents you?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 8 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 9 },
];

export const HEADSHOTS_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Is this for a specific use — LinkedIn, a company website, an agency, an acting reel? Let us know so we can tailor the shots.", hint: null, sort_order: 1 },
  { section: 'Your look', prompt: "Do you have an outfit — or a couple options — in mind? Solid colors generally photograph best.", hint: null, sort_order: 2 },
  { section: 'Your look', prompt: "Would you like hair and makeup included, or will you be arriving camera-ready?", hint: null, sort_order: 3 },
  { section: 'Your photos', prompt: "Do you need a plain background, an office or branded setting, or something more editorial?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "How many final images do you need, and in what format — square for LinkedIn, etc.?", hint: null, sort_order: 5 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 7 },
];

export const BRANDING_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Where would you like to shoot — your workspace, a studio, on location with your product?", hint: null, sort_order: 1 },
  { section: 'Your brand', prompt: "Tell us about your business — what do you do, and who's your ideal client?", hint: null, sort_order: 2 },
  { section: 'Your brand', prompt: "What's your brand's color palette or aesthetic — light & airy, bold, moody, minimalist?", hint: null, sort_order: 3 },
  { section: 'Your brand', prompt: "What will these photos be used for — your website, social media, a course, a press kit?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Are there specific shots you need — headshots, working shots, product-in-hand, flat lays?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 8 },
];

export const GRADUATION_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Do you have a location in mind — your campus, a favorite spot, somewhere meaningful to your degree?", hint: null, sort_order: 1 },
  { section: 'Your look', prompt: "Will you be wearing your cap and gown, regular clothes, or both?", hint: null, sort_order: 2 },
  { section: 'Your look', prompt: "Any props you'd like included — diploma, school pennant, cords or honors regalia?", hint: null, sort_order: 3 },
  { section: 'Your photos', prompt: "Are there any must-have shots or poses you're hoping for?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 5 },
  { section: 'The human stuff', prompt: "What did you study, and what's next for you?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 8 },
];

export const SPORTS_TEAM_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule the session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Where will the session take place — a field, gym, or specific venue?", hint: null, sort_order: 1 },
  { section: 'Team details', prompt: "What's the team or league name, and how many players or athletes will be photographed?", hint: null, sort_order: 2 },
  { section: 'Team details', prompt: "Will you need individual photos, team photos, or both?", hint: null, sort_order: 3 },
  { section: 'Team details', prompt: "Do you need any specific products — trading cards, buttons, banners — in addition to digital images?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Any specific poses — action shots, classic team lineup — you'd like us to plan around?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before the session — schedule constraints, coach contact, etc.?", hint: null, sort_order: 7 },
];

export const BOUDOIR_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "When would you like to schedule your session, and do you have flexibility on the date or time?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Would you prefer our studio, a hotel suite, or your own home for the session?", hint: null, sort_order: 1 },
  { section: 'Your comfort', prompt: "Would you like hair and makeup included, or will you arrive ready?", hint: null, sort_order: 2 },
  { section: 'Your comfort', prompt: "Is there anything that would help you feel more comfortable during the session — a support person present, a specific music playlist?", hint: null, sort_order: 3 },
  { section: 'Your photos', prompt: "What's this session for — a gift for a partner, a personal celebration, something else?", hint: null, sort_order: 4 },
  { section: 'Your photos', prompt: "Do you have any wardrobe pieces in mind, or would you like to borrow from a client wardrobe if available?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 6 },
  { section: 'The human stuff', prompt: "How do you feel in front of the camera — totally at ease, or a bit nervous? We'll go at whatever pace feels right.", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before your session?", hint: null, sort_order: 8 },
];


export const DANCE_DEFAULTS: QuestionDefault[] = [
  { section: 'Logistics', prompt: "What's the name and date of the dance, and what time does it start?", hint: null, sort_order: 0 },
  { section: 'Logistics', prompt: "Where would you like photos taken — at your home, a specific outdoor spot, or somewhere near the venue?", hint: null, sort_order: 1 },
  { section: 'Group details', prompt: "Who's included in the photos — just the couple, a larger group, or families too?", hint: null, sort_order: 2 },
  { section: 'Group details', prompt: "About how many people total, so we can plan timing and framing?", hint: null, sort_order: 3 },
  { section: 'Your look', prompt: "What colors are the outfits or dresses, so we can plan around them?", hint: null, sort_order: 4 },
  { section: 'Your look', prompt: "Any corsage, boutonniere, or accessories we should plan a few extra shots around?", hint: null, sort_order: 5 },
  { section: 'Your photos', prompt: "Any specific poses or shots you'd love — classic couple shots, funny group photos, both?", hint: null, sort_order: 6 },
  { section: 'Your photos', prompt: "Any Pinterest boards or inspiration photos you'd love us to recreate?", hint: null, sort_order: 7 },
  { section: 'The human stuff', prompt: "Is there anything else you think we should know before the session — timing constraints, parent contact, etc.?", hint: null, sort_order: 8 },
];

export const DEFAULTS_BY_TYPE: Record<string, QuestionDefault[]> = {
  wedding: WEDDING_DEFAULTS,
  engagement: ENGAGEMENT_DEFAULTS,
  proposal: PROPOSAL_DEFAULTS,
  maternity: MATERNITY_DEFAULTS,
  newborn: NEWBORN_DEFAULTS,
  family: FAMILY_DEFAULTS,
  senior: SENIOR_DEFAULTS,
  headshots: HEADSHOTS_DEFAULTS,
  branding: BRANDING_DEFAULTS,
  graduation: GRADUATION_DEFAULTS,
  sports_team: SPORTS_TEAM_DEFAULTS,
  boudoir: BOUDOIR_DEFAULTS,
  dance: DANCE_DEFAULTS,
};
