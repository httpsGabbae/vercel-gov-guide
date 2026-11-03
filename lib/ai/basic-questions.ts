/** Full-message matching only: never turn a polite prefix into a safety exemption. */
export function normalizeBasicQuestion(input: string): string {
  return input
    .normalize('NFKC')
    .toLowerCase()
    .replace(/what['’]s/g, 'what is')
    .replace(/[\p{P}\p{S}]/gu, ' ')
    .replace(/\b(po|opo|please)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function basicQuestionKind(input: string): 'identity' | 'help' | 'service' | null {
  const text = normalizeBasicQuestion(input).replace(/^(?:hi|hello|hey|kumusta|kamusta)\s+/, '');
  if (
    /^(?:who am i|what is my name|do you know (?:me|my name)|what do you know about me|sino (?:ba )?ako|ano(?:ng| ang) (?:aking )?pangalan(?: ko)?|kilala mo ba ako|kilala mo ako|naaalala mo ba ako|anong alam mo (?:sa|tungkol sa) akin)$/.test(
      text,
    )
  )
    return 'identity';
  if (
    /^(?:can you (?:help|assist) me|could you help me|i need help|i need assistance|help me get started|what (?:can you help me with|services do you (?:offer|support))|what is govguide(?: ph)?|ano ang govguide(?: ph)?|ano(?:ng| ang) (?:mga )?(?:serbisyo|maitutulong mo)|ano(?:ng| ang) pangalan mo|sino kayo|paano (?:ito|to) (?:gamitin|gumagana)|paano magsimula|tulungan mo (?:ako|naman ako)|patulong(?: naman)?|kailangan ko ng tulong|(?:pwede|puwede) (?:ba )?(?:akong magtanong|magtanong|mo (?:ba )?akong tulungan))$/.test(
      text,
    )
  )
    return 'help';
  if (
    /^(?:how much(?: is (?:it|the fee))?|magkano(?: ang bayad)?|may bayad ba|libre ba|what (?:are the requirements|documents do i need|do i need)|ano(?:ng| ang) (?:mga )?(?:kailangan|requirements|dokumento)|saan (?:ako )?(?:pupunta|mag aapply)|where (?:do i go|can i apply)|how (?:do i apply|long does it take)|paano (?:mag apply|kumuha|magparehistro)|gaano katagal|requirements|fees|documents)$/.test(
      text,
    )
  )
    return 'service';
  return null;
}

export function basicQuestionReply(
  input: string,
  filipino: boolean,
  suppliedName?: string,
): string | null {
  const kind = basicQuestionKind(input);
  if (kind === 'identity') {
    const name = suppliedName?.trim();
    return name
      ? filipino
        ? `Ang pangalang ibinigay sa kasalukuyan mong profile ay ${name}. Hindi ito pagpapatunay ng iyong pagkakakilanlan. Maaari mo itong itama sa My Details.`
        : `The name provided in your current profile is ${name}. This does not verify your identity. You can correct it in My Details.`
      : filipino
        ? 'Hindi ko pa alam ang pangalan mo. Maaari mong sabihin kung ano ang gusto mong itawag ko sa iyo o ilagay ito sa My Details. Hindi kailangang magbigay ng ID number.'
        : 'I don’t know your name yet. You can tell me what you’d like to be called or add it in My Details. You do not need to provide an ID number.';
  }
  if (kind === 'help')
    return filipino
      ? 'Ako ang GovGuide PH, isang AI assistant para sa mga serbisyo ng gobyerno. Makakatulong ako sa requirements, mga hakbang sa aplikasyon, at paunang pagsusuri ng dokumento. Anong serbisyo ang kailangan mo?'
      : 'I’m GovGuide PH, an AI assistant for Philippine government services. I can help with requirements, application steps, and preliminary document checks. Which service do you need?';
  if (kind === 'service')
    return filipino
      ? 'Para sa aling serbisyo o dokumento ang tanong mo—halimbawa, NBI Clearance, PSA Birth Certificate, o PhilHealth? Magkakaiba ang requirements, bayad, at proseso ng bawat serbisyo.'
      : 'Which service or document are you asking about—for example, NBI Clearance, PSA Birth Certificate, or PhilHealth? Requirements, fees, and steps differ by service.';
  return null;
}
