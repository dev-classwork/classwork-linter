import { analyzeSourceCode } from 'lizard-py';

interface LinterConfig {
  /**
   * Os arquivos a serem ignorados instantaneamente na leitura,
   * sejá dévido ao nome ou ao seu tamanho em bytes.
   *
   * @param includesInName filtro utilizado para detectar o nome do arquivo,
   * se o arquivo conter em seu interior essa String ele será ignorado.
   *
   * @param maxSize se o arquivo não for excluído pelo nome, o tamanho máximo dirá
   * se ele deve ou não ser ignorado.
   *
   * Se o valor for [false] nenhum arquivo será ignorado.
   */
  ignoreFiles?:
  | false
  | {
    includesInName?: string[];
    maxSize?: number;
  };

  /**
   * Caracteres/substrings que serão removidos ou substituídos antes da leitura do lizard-py.
   *
   * @param startWith (Regex String) onde a substring que será removida começa, se for um caractere, não inclua o [endWith].
   *
   * @param endWith (Regex String) onde a substring que será removida termina.
   *
   * @param replace valor que substituirá o caractere ou substring.
   *
   * Aviso: só altere os valores padrões se necessário.
   */
  ignoreChars: { startWith?: string; endWith?: string; replace?: string; direct?: string }[];
}

interface OldLizardObject {
  filename: string;
  nloc: number;
  function_list: {
    cyclomatic_complexity: number;
    nloc: number;
    token_count: number;
    name: string;
    long_name: string;
    start_line: number;
    end_line: number;
    parameters: string[];
    filename: string;
    top_nesting_level: number;
    length: number;
    fan_in: number;
    fan_out: number;
    general_fan_out: number;
  }[];
  token_count: number;
}

interface LizardObject {
  qtdLines: number;
  qtdMethods: number;
  cyclomaticComplexity: number;
  token: number;
  methods: {
    name: string;
    longName: string;
    cyclomaticComplexity: number;
    startLine: number;
    endLine: number;
    parameters: string[];
    filename: string;
    topNestingLevel: number;
    length: number;
    fanIn: number;
    fanOut: number;
    generalFanOut: number;
  }[];
  source: string;
}

let defaultConfigLinter: LinterConfig = {
  ignoreChars: [
    {
      direct: `\/\*{1,2}[\s\S]*?\*\/`,
    },
    {
      startWith: `"`,
      endWith: `"`,
      replace: `""`,
    },
    {
      startWith: `'`,
      endWith: `'`,
      replace: `''`,
    },
    {
      startWith: `//`,
      endWith: `\n`,
    },
    {
      direct: `^\s*\n`,
    },
    {
      startWith: ` \\{`,
      replace: `{`,
    },
  ],
};

export default async function classworkLinter(
  source: string | string[],
  filename: string,
  config?: LinterConfig,
): Promise<LizardObject> {
  if (!config) {
    config = { ...defaultConfigLinter };
  } else {
    config = {
      ...defaultConfigLinter,
      ...config,
      ignoreChars: config.ignoreChars ? config.ignoreChars : defaultConfigLinter.ignoreChars,
    };
  }

  try {
    if (typeof source !== 'string') {
      try {
        source = source.join('\n');
      } catch (e) {
        source = source.toString();
      }
    }
  
    for (let x in config.ignoreChars) {
      let chars = config.ignoreChars[x];
      let stringRegex = chars.startWith?
      chars.endWith ? `(${chars.startWith})(.+)(${chars.endWith})` : `(${chars.startWith})`:
      `${chars.direct}`;
  
      let regex = new RegExp(stringRegex, 'g');
      source = source.replace(regex, chars.replace ? chars.replace : '');
    }
  
    let regex = new RegExp('}', 'g');
    source = source.replace(regex, '};');
  
    //Infelizmente, isso se trata de um erro que ainda nãp resolvi no
    //lizard-py. Eu não entendo muito de python e não tenho muita informação sobre o 
    //autor para entrar em contato
    filename = filename.replace(".js", ".java").replace(".ts", ".java").replace(".tsx", ".java");
    
    const response = (await analyzeSourceCode(filename, source)) as OldLizardObject;
    let cyclomaticComplexity = 0;
  
    for (let x in response.function_list) {
      let f = response.function_list[x];
  
      cyclomaticComplexity += f.cyclomatic_complexity;
    }
  
    let methods = response.function_list.map((item) => {
      let funcName = item.long_name.replace(/\( /gs, '(').replace(/\[ /gs, '[');
  
      return {
        name: item.name,
        longName: funcName,
        cyclomaticComplexity: item.cyclomatic_complexity,
        startLine: item.start_line,
        endLine: item.end_line,
        parameters: item.parameters,
        filename: item.filename,
        topNestingLevel: item.top_nesting_level,
        length: item.length,
        fanIn: item.fan_in,
        fanOut: item.fan_out,
        generalFanOut: item.general_fan_out,
      };
    });
  
    return {
      qtdLines: response.nloc,
      qtdMethods: response.function_list.length,
      cyclomaticComplexity,
      token: response.token_count,
      methods,
      source,
    };
  } catch (error) {
    return {
      qtdLines: 0,
      qtdMethods: 0,
      cyclomaticComplexity: 0,
      token: 0,
      methods: [],
      source: `[error]: ${error}`,
    };
  }
}
