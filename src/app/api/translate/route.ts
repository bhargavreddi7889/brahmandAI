import { NextRequest, NextResponse } from 'next/server';

// Check if API key is available
const apiKey = process.env.HUGGINGFACE_API_KEY;
if (!apiKey) {
  console.warn('Warning: HUGGINGFACE_API_KEY is not set');
}

// Define specialized models for Indian languages
const INDIAN_LANGUAGE_MODELS: Record<string, string> = {
  'en-hi': 'Helsinki-NLP/opus-mt-en-hi',
  'hi-en': 'Helsinki-NLP/opus-mt-hi-en',
  'en-ta': 'Helsinki-NLP/opus-mt-en-ta',
  'ta-en': 'Helsinki-NLP/opus-mt-ta-en',
  'en-te': 'Helsinki-NLP/opus-mt-en-ta', // Fallback to Tamil for Telugu as direct model may not exist
  'te-en': 'Helsinki-NLP/opus-mt-mul-en', // Use multilingual model for Telugu to English
  'en-bn': 'Helsinki-NLP/opus-mt-en-NORTH_INDIAN',
  'bn-en': 'Helsinki-NLP/opus-mt-NORTH_INDIAN-en',
  'en-ml': 'Helsinki-NLP/opus-mt-en-dra', // Dravidian languages group
  'ml-en': 'Helsinki-NLP/opus-mt-mul-en',
  'en-kn': 'Helsinki-NLP/opus-mt-en-dra', // Dravidian languages group
  'kn-en': 'Helsinki-NLP/opus-mt-mul-en'
};

// Advanced backup models with better multilingual support
const BACKUP_MODELS = [
  "facebook/mbart-large-50-many-to-many-mmt", // Good for most language pairs
  "facebook/nllb-200-distilled-600M",         // Stronger for low-resource languages
  "ai4bharat/indictrans2-indic-en-1B",       // Specialized for Indian languages
];

export async function POST(req: NextRequest) {
  try {
    // Check for valid API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          translation: 'API key not configured. Please add your HUGGINGFACE_API_KEY to .env.local file.',
          mockData: true
        },
        { status: 200 }
      );
    }
    
    // Parse request body
    let text, sourceLang, targetLang;
    try {
      const body = await req.json();
      text = body.text;
      sourceLang = body.sourceLang;
      targetLang = body.targetLang;
    } catch (error) {
      console.error('Error parsing request body:', error);
      return NextResponse.json(
        { 
          error: 'Invalid request body',
          translation: 'Error: Could not parse request body.'
        },
        { status: 400 }
      );
    }

    if (!text || !sourceLang || !targetLang) {
      return NextResponse.json(
        { 
          error: 'Text, source language, and target language are required',
          translation: 'Error: Missing required fields (text, sourceLang, or targetLang).'
        },
        { status: 400 }
      );
    }

    console.log(`Translating text from ${sourceLang} to ${targetLang}`);
    
    // Get source and target language codes
    const sourceCode = getLanguageCode(sourceLang);
    const targetCode = getLanguageCode(targetLang);
    
    // Check if we're dealing with an Indian language pair
    const isIndianLanguagePair = isIndianLanguage(sourceCode) || isIndianLanguage(targetCode);
    const languagePair = `${sourceCode}-${targetCode}`;
    
    // Select the best model for the language pair
    let primaryModel;
    if (isIndianLanguagePair && INDIAN_LANGUAGE_MODELS[languagePair]) {
      // Use specialized model for Indian language pairs
      primaryModel = INDIAN_LANGUAGE_MODELS[languagePair];
    } else {
      // Use generic Helsinki-NLP model for other pairs
      primaryModel = `Helsinki-NLP/opus-mt-${sourceCode}-${targetCode}`;
    }
    
    // Track which model was used successfully
    let usedModel = null;
    let translation = null;
    
    try {
      // First try with specialized/primary model
      console.log(`Attempting translation with model: ${primaryModel}`);
      const response = await fetch(
        `https://api-inference.huggingface.co/models/${primaryModel}`,
        {
          headers: { 
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json" 
          },
          method: "POST",
          body: JSON.stringify({ inputs: text }),
          signal: AbortSignal.timeout(6000) // 6 second timeout
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        if (Array.isArray(result) && result.length > 0 && result[0].translation_text) {
          translation = result[0].translation_text;
          usedModel = primaryModel;
        } else if (result.translation_text) {
          translation = result.translation_text;
          usedModel = primaryModel;
        }
      }
      
      // If primary model failed or returned empty result, try backup models in sequence
      if (!translation) {
        console.log("Primary model failed or returned empty result. Trying backup models.");
        
        // For Indian languages, use specialized indic backup first if applicable
        if (isIndianLanguagePair) {
          try {
            const indicModel = "ai4bharat/indictrans2-indic-en-1B";
            console.log(`Trying specialized Indian language model: ${indicModel}`);
            
            const indicResponse = await fetch(
              `https://api-inference.huggingface.co/models/${indicModel}`,
              {
                headers: { 
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json" 
                },
                method: "POST",
                body: JSON.stringify({ 
                  inputs: text,
                  parameters: {
                    src_lang: getIndicCode(sourceCode),
                    tgt_lang: getIndicCode(targetCode)
                  }
                }),
              }
            );
            
            if (indicResponse.ok) {
              const result = await indicResponse.json();
              if (result.translation_text || (Array.isArray(result) && result.length > 0)) {
                translation = Array.isArray(result) ? result[0].translation_text : result.translation_text;
                usedModel = indicModel;
              }
            }
          } catch (indicError) {
            console.warn("Error using specialized Indian language model:", indicError);
          }
        }
        
        // Try each backup model in sequence until one works
        for (const backupModel of BACKUP_MODELS) {
          if (translation) break; // Stop if we already have a translation
          
          try {
            console.log(`Trying backup model: ${backupModel}`);
            const backupResponse = await fetch(
              `https://api-inference.huggingface.co/models/${backupModel}`,
              {
                headers: { 
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json" 
                },
                method: "POST",
                body: JSON.stringify({ 
                  inputs: text,
                  parameters: {
                    src_lang: getM2MLangCode(sourceLang),
                    tgt_lang: getM2MLangCode(targetLang)
                  }
                }),
              }
            );
            
            if (backupResponse.ok) {
              const backupResult = await backupResponse.json();
              if (backupResult.translation_text || (Array.isArray(backupResult) && backupResult.length > 0)) {
                translation = Array.isArray(backupResult) 
                  ? backupResult[0].translation_text || backupResult[0].generated_text
                  : backupResult.translation_text || backupResult.generated_text;
                usedModel = backupModel;
                break;
              }
            }
          } catch (backupError) {
            console.warn(`Error with backup model ${backupModel}:`, backupError);
          }
        }
      }
      
      // If all models failed, provide a helpful error
      if (!translation) {
        return NextResponse.json({ 
          translation: `Translation not available for ${sourceLang} to ${targetLang}. Please try another language pair.`,
          error: 'All translation models failed',
          modelsTried: [primaryModel, ...BACKUP_MODELS]
        });
      }
      
      return NextResponse.json({ 
        translation, 
        model_used: usedModel,
        is_indian_language_pair: isIndianLanguagePair
      });
      
    } catch (error) {
      console.error('Error from translation model:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error translating text:', error);
    // Provide a more detailed error message
    const errorDetails = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        error: 'Failed to translate text', 
        translation: `Error occurred: ${errorDetails}`,
        details: errorDetails
      },
      { status: 500 }
    );
  }
}

// Check if a language code is an Indian language
function isIndianLanguage(code: string): boolean {
  return ['hi', 'te', 'ta', 'kn', 'ml', 'bn', 'gu', 'mr', 'pa', 'or', 'as', 'sa'].includes(code.toLowerCase());
}

// Get ai4bharat/indictrans2 specific codes for Indian languages
function getIndicCode(code: string): string {
  const indicCodes: Record<string, string> = {
    'en': 'eng_Latn',
    'hi': 'hin_Deva',
    'te': 'tel_Telu',
    'ta': 'tam_Taml',
    'kn': 'kan_Knda',
    'ml': 'mal_Mlym',
    'bn': 'ben_Beng',
    'gu': 'guj_Gujr',
    'mr': 'mar_Deva',
    'pa': 'pan_Guru',
    'or': 'ory_Orya',
    'as': 'asm_Beng'
  };
  
  return indicCodes[code.toLowerCase()] || 'eng_Latn';
}

// Helper function to convert language names to language codes
function getLanguageCode(language: string): string {
  const languageCodes: Record<string, string> = {
    'english': 'en',
    'spanish': 'es',
    'french': 'fr',
    'german': 'de',
    'italian': 'it',
    'portuguese': 'pt',
    'russian': 'ru',
    'japanese': 'ja',
    'chinese': 'zh',
    'korean': 'ko',
    'arabic': 'ar',
    'hindi': 'hi',
    'telugu': 'te',
    'tamil': 'ta',
    'kannada': 'kn',
    'malayalam': 'ml',
    'bengali': 'bn',
    'turkish': 'tr',
    'dutch': 'nl',
    'swedish': 'sv',
    'polish': 'pl',
    'vietnamese': 'vi',
    'thai': 'th',
  };
  
  // Try to match by name (case insensitive)
  const lowerCaseLanguage = language.toLowerCase();
  if (languageCodes[lowerCaseLanguage]) {
    return languageCodes[lowerCaseLanguage];
  }
  
  // If it's already a code like 'en', 'fr', etc., return as is
  if (lowerCaseLanguage.length === 2) {
    return lowerCaseLanguage;
  }
  
  // Default to English if language not recognized
  console.warn(`Language code not found for "${language}", defaulting to English`);
  return 'en';
}

// Helper function to get Facebook's M2M100/MBart specific language codes
function getM2MLangCode(language: string): string {
  const m2mCodes: Record<string, string> = {
    'english': 'en_XX',
    'spanish': 'es_XX',
    'french': 'fr_XX',
    'german': 'de_DE',
    'italian': 'it_IT',
    'portuguese': 'pt_XX',
    'russian': 'ru_RU',
    'japanese': 'ja_XX',
    'chinese': 'zh_CN',
    'korean': 'ko_KR',
    'arabic': 'ar_AR',
    'hindi': 'hi_IN',
    'telugu': 'te_IN',
    'tamil': 'ta_IN',
    'kannada': 'kn_IN',
    'malayalam': 'ml_IN',
    'bengali': 'bn_IN',
    'turkish': 'tr_TR',
    'dutch': 'nl_XX',
    'swedish': 'sv_XX',
    'polish': 'pl_XX',
    'vietnamese': 'vi_VN',
    'thai': 'th_TH',
  };
  
  const lowerCaseLanguage = language.toLowerCase();
  return m2mCodes[lowerCaseLanguage] || 'en_XX'; // Default to English
} 