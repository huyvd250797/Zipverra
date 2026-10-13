/** Small presentation-only tokenizer; all text is rendered as React text nodes (never HTML). */
const KEYWORDS = /^(?:import|from|export|default|return|const|let|var|function|class|extends|new|if|else|try|catch|throw|await|async|while|for|of|in|switch|case|break|continue|interface|type|public|private|readonly|true|false|null|undefined)$/;
const NUMBER = /^\d+(?:\.\d+)?$/;
const TOKEN = /\/\/.*$|#[^\n]*$|\b(?:import|from|export|default|return|const|let|var|function|class|extends|new|if|else|try|catch|throw|await|async|while|for|of|in|switch|case|break|continue|interface|type|public|private|readonly|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[^*]*\*+(?:[^/*][^*]*\*+)*\/|\b[A-Za-z_$][\w$]*(?=\s*\()/g;
export function highlightSegments(line, language='Text') {
  if(typeof line!=='string') return [{text:'',kind:'normal'}];
  if(language==='Text' || language==='Markdown')return [{text:line,kind:'normal'}];
  const result=[];let last=0;
  TOKEN.lastIndex=0;
  for(const found of line.matchAll(TOKEN)){
    const index=found.index;
    if(index>last) result.push({text:line.slice(last,index),kind:'normal'});
    const token=found[0];
    let kind='function';
    if(token.startsWith('//')||token.startsWith('#')||token.startsWith('/*'))kind='comment';
    else if(token.startsWith('"')||token.startsWith("'")||token.startsWith('`'))kind='string';
    else if(KEYWORDS.test(token))kind='keyword';
    else if(NUMBER.test(token))kind='number';
    result.push({text:token,kind});last=index+token.length;
  }
  if(last<line.length)result.push({text:line.slice(last),kind:'normal'});
  return result.length?result:[{text:'',kind:'normal'}];
}
