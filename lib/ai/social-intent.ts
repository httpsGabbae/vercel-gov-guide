import { normalizeBasicQuestion } from './basic-questions';
/** Match complete social turns only; a greeting prefix must not hide a request. */
export function isSocialTurn(input: string): boolean {
  const text = normalizeBasicQuestion(input);
  if (!text) return false;
  const phrase =
    /^(?:hi|hello|hey|hiya|good (?:morning|afternoon|evening|day)|magandang (?:umaga|tanghali|hapon|gabi|araw)|kumusta ka|kamusta ka|kumusta|kamusta|mabuhay|how are you(?: doing)?|kumusta ka|kamusta ka|thank you(?: very much)?|thanks|maraming salamat|salamat|you re welcome|bye|goodbye|paalam|ingat|who are you|who r u|what are you|what is this|what is your name|what do you do|sino ka(?: ba)?|sino po kayo|ano ka|ano ito|introduce yourself|tell me about yourself|what can you do|how can you help(?: me)?|how does this work|ano ang (?:kaya mong gawin|magagawa mo)|paano ka makakatulong|magpakilala ka|help(?: me)?|tulong|can you help(?: me)?|pwede magtanong|puwede magtanong)(?= |$)/;
  let remaining = text;
  let matched = false;
  while (remaining) {
    const match = remaining.match(phrase);
    if (!match) return false;
    matched = true;
    remaining = remaining
      .slice(match[0].length)
      .trim()
      .replace(
        /^(?:(?:po|opo|there|friend|ai|bot|govguide ph|govguideph|govguide|kaagapai|kaagap)\b\s*)+/,
        '',
      )
      .trim();
  }
  return matched;
}

export function socialReply(input: string, filipino: boolean): string {
  if (/\b(thanks|thank you|salamat)\b/i.test(input)) {
    return filipino
      ? 'Walang anuman! Nandito ang GovGuide PH kung kailangan mo pa ng gabay sa serbisyo ng gobyerno.'
      : 'You’re welcome! GovGuide PH is here if you need more help with government services.';
  }
  if (/\b(bye|goodbye|paalam|ingat)\b/i.test(input)) {
    return filipino
      ? 'Paalam, at ingat! Nandito ang GovGuide PH kapag kailangan mo ng tulong.'
      : 'Take care! GovGuide PH is here whenever you need help.';
  }
  return filipino
    ? 'Magandang araw! Ako ang **GovGuide PH**, ang iyong AI assistant para sa mga serbisyo ng gobyerno. Maaari kitang tulungan sa requirements, mga hakbang sa aplikasyon, at paunang pagsusuri ng dokumento. Anong serbisyo ang kailangan mo?'
    : 'Hello! I’m **GovGuide PH**, your AI assistant for Philippine government services. I can help with requirements, application steps, and preliminary document checks. Which service do you need help with?';
}
