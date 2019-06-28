/**
 *
 * @author Hemant Juyal
 */

// sets up dependencies
const Alexa = require('ask-sdk-core');
const i18n = require('i18next');
const sprintf = require('i18next-sprintf-postprocessor');
const striptags = require('striptags');
const BRAND_LOGO = 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/musical_instruments_quiz_logo.jpg';
const BRAND_BANNER = 'https://smartassistants.s3-eu-west-1.amazonaws.com/images/logo/musical_instruments_quiz_logo.jpg';
const riddles = require('./data/riddles');
const riddles_hi = require('./data/riddles');

const WelcomeHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    // checks request type
    return request.type === 'LaunchRequest' ||
      (request.type === 'IntentRequest' &&
        request.intent.name === 'WelcomeIntent');
  },
  handle(handlerInput) {
    console.log('WelcomeHandler called');
    const request = handlerInput.requestEnvelope.request;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const riddleAttributes = handlerInput.attributesManager.getSessionAttributes();
    console.log('requestAttributes ', JSON.stringify(requestAttributes));
    console.log('riddleAttributes ', JSON.stringify(riddleAttributes));

    const riddle = getRiddle(request.locale);
    riddleAttributes.riddle_index = riddle.index;
    handlerInput.attributesManager.setSessionAttributes(riddleAttributes);
    let speakOutput = requestAttributes.t('WELCOME_MESSAGE', requestAttributes.t('SKILL_NAME'),
      requestAttributes.t('SKILL_NAME'), requestAttributes.t('RIDDLE_QUESTION', riddle.riddle_text));
    let repromptOutput = requestAttributes.t('RIDDLE_QUESTION_REPROMPT');
    let displayData = {
      title: requestAttributes.t('WLECOME_MESSAGE_DISPLAY_TITLE'),
      primaryText: requestAttributes.t('WLECOME_MESSAGE_DISPLAY_BODY'),
      secondaryText: null,
      tertiaryText: null,
      imageUrl: BRAND_LOGO,
      templateType: 'BodyTemplate2'
    };

    if (supportsDisplay(handlerInput)) {
      // let responseBuilder = processBodyTemplate(handlerInput.responseBuilder, displayData);

      let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
      let textContent = new Alexa.RichTextContentHelper()
        .withPrimaryText(displayData.primaryText)
        .withSecondaryText(displayData.secondaryText)
        .withTertiaryText(displayData.tertiaryText)
        .getTextContent();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .addRenderTemplateDirective({
          type: displayData.templateType,
          backButton: 'visible',
          image: image,
          title: displayData.title,
          textContent: textContent,
        })
        .getResponse();

    } else {
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .withStandardCard(displayData.title, displayData.primaryText, displayData.imageUrl)
        .getResponse();
    }
  },
};

const RiddleAnswerHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'RiddleAnswerIntent';
  },
  handle(handlerInput) {
    console.log('RiddleAnswerHandler called');

    const request = handlerInput.requestEnvelope.request;
    const slots = handlerInput.requestEnvelope.request.intent.slots;
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    const riddleAttributes = handlerInput.attributesManager.getSessionAttributes();
    const riddle_answer_resolved = resolveCanonical(slots.riddle_answer);
    const riddleResult = getRiddleResult(request.locale,
      riddleAttributes.riddle_index, riddle_answer_resolved);
    console.log('riddleResult ', riddleResult);

    let preamble;
    if (riddleResult.is_correct) {
      preamble = requestAttributes.t('RIDDLE_ANSWER_RIGHT');
    } else {
      preamble = requestAttributes.t('RIDDLE_ANSWER_WRONG');
    }

    const riddleNext = getRiddle(request.locale);
    riddleAttributes.riddle_index = riddleNext.index;
    handlerInput.attributesManager.setSessionAttributes(riddleAttributes);
    let speakOutput = requestAttributes.t('RIDDLE_ANSWER', preamble,
      riddleResult.riddle_answer,
      requestAttributes.t('RIDDLE_QUESTION_ANOTHER', riddleNext.riddle_text));
    let repromptOutput = requestAttributes.t('RIDDLE_ANSWER_REPROMPT', riddleNext.riddle_text);
    let displayData = {
      title: requestAttributes.t('RIDDLE_ANSWER_DISPLAY_TITLE'),
      primaryText: requestAttributes.t('RIDDLE_ANSWER_DISPLAY_BODY'),
      secondaryText: null,
      tertiaryText: null,
      imageUrl: BRAND_LOGO,
      templateType: 'BodyTemplate2'
    };


    if (supportsDisplay(handlerInput)) {
      // let responseBuilder = processBodyTemplate(handlerInput.responseBuilder, displayData);

      let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
      let textContent = new Alexa.RichTextContentHelper()
        .withPrimaryText(displayData.primaryText)
        .withSecondaryText(displayData.secondaryText)
        .withTertiaryText(displayData.tertiaryText)
        .getTextContent();

      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .addRenderTemplateDirective({
          type: displayData.templateType,
          backButton: 'visible',
          image: image,
          title: displayData.title,
          textContent: textContent,
        })
        .getResponse();

    } else {
      return handlerInput.responseBuilder
        .speak(speakOutput)
        .reprompt(repromptOutput)
        .withStandardCard(displayData.title, striptags(displayData.primaryText, [], '\n'), displayData.imageUrl)
        .getResponse();
    }

  },
};


const HelpHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    console.log('HelpHandler called');

    const request = handlerInput.requestEnvelope.request;
    const riddle = getRiddle(request.locale);
    const riddleAttributes = handlerInput.attributesManager.getSessionAttributes();
    riddleAttributes.riddle_index = riddle.index;
    handlerInput.attributesManager.setSessionAttributes(riddleAttributes);

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('HELP_MESSAGE', requestAttributes.t('SKILL_NAME'), riddle.riddle_text))
      .reprompt(requestAttributes.t('HELP_REPROMPT'))
      .getResponse();
  },
};

const FallbackHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      request.intent.name === 'AMAZON.FallbackIntent';
  },
  handle(handlerInput) {
    console.log('FallbackHandler called');

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    console.log('requestAttributes ', JSON.stringify(requestAttributes));

    return handlerInput.responseBuilder
      .speak(requestAttributes.t('FALLBACK_MESSAGE', requestAttributes.t('SKILL_NAME')))
      .reprompt(requestAttributes.t('FALLBACK_REPROMPT'))
      .getResponse();
  },
};

const ExitHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' &&
      (request.intent.name === 'AMAZON.CancelIntent' ||
        request.intent.name === 'AMAZON.StopIntent');
  },
  handle(handlerInput) {
    console.log('ExitHandler called');

    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('STOP_MESSAGE'))
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log('SessionEndedRequestHandler called');
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);
    console.log(`Error stack: ${error.stack}`);
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    return handlerInput.responseBuilder
      .speak(requestAttributes.t('ERROR_MESSAGE'))
      .reprompt(requestAttributes.t('ERROR_MESSAGE'))
      .getResponse();
  },
};

const LocalizationInterceptor = {
  process(handlerInput) {
    console.log('LocalizationInterceptor called');
    console.log('LocalizationInterceptor::request ', JSON.stringify(handlerInput.requestEnvelope));
    const requestAttributes = handlerInput.attributesManager.getRequestAttributes();
    console.log('requestAttributes ', JSON.stringify(requestAttributes));

    const localizationClient = i18n.use(sprintf).init({
      lng: handlerInput.requestEnvelope.request.locale,
      resources: languageStrings,
    });
    localizationClient.localize = function localize() {
      const args = arguments;
      const values = [];
      for (let i = 1; i < args.length; i += 1) {
        values.push(args[i]);
      }
      const value = i18n.t(args[0], {
        returnObjects: true,
        postProcess: 'sprintf',
        sprintf: values,
      });
      if (Array.isArray(value)) {
        return value[Math.floor(Math.random() * value.length)];
      }
      return value;
    };
    const attributes = handlerInput.attributesManager.getRequestAttributes();
    attributes.t = function translate(...args) {
      return localizationClient.localize(...args);
    };
  },
};


function supportsDisplay(handlerInput) {
  console.log('supportsDisplay called');

  var hasDisplay =
    handlerInput.requestEnvelope.context &&
    handlerInput.requestEnvelope.context.System &&
    handlerInput.requestEnvelope.context.System.device &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
    handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;

  console.log('is display device ', hasDisplay);
  return hasDisplay;

}; // end


function processBodyTemplate(response, displayData) {
  console.log('processBodyTemplate called');

  let image = new Alexa.ImageHelper().addImageInstance(displayData.imageUrl).getImage();
  let textContent = new Alexa.RichTextContentHelper()
    .withPrimaryText(displayData.primaryText)
    .withSecondaryText(displayData.secondaryText)
    .withTertiaryText(displayData.tertiaryText)
    .getTextContent();

  response.addRenderTemplateDirective({
    type: displayData.templateType,
    backButton: 'visible',
    image: image,
    title: displayData.templateTitle,
    textContent: textContent,
  });

  return response;

};

function getRiddle(locale) {
  console.log('getRiddle called');
  console.log('locale ', locale);

  let index, riddle_text;
  index = Math.floor(Math.random() * (riddles.riddles_data.length - 1));
  if (locale === 'en-IN' ||
    locale === 'en-US') {
    riddle_text = riddles.riddles_data[index].question;
  } else if (locale === 'hi-IN') {
    riddle_text = riddles_hi.riddles_data_hi[index_hi].question;
  }
  console.log('index ', index);

  return {
    'index': index,
    'riddle_text': riddle_text
  }

}; // end

function getRiddleResult(locale, riddleIndex, riddle_answer_user) {
  console.log('getRiddleResult called');
  console.log('locale ', locale);
  console.log('index ', riddleIndex);
  console.log('riddle answer user ', riddle_answer_user);

  let is_correct = false,
    riddle_answers;
  if (locale === 'en-IN' ||
    locale === 'en-US') {
    riddle_answers = riddles.riddles_data[riddleIndex].answer;
    /*if (riddle_answer.toLowerCase() === riddle_answer_user.toLowerCase()) {
      is_correct = true;
    }*/
  } else if (locale === 'hi-IN') {
    riddle_answers = riddles_hi.riddles_data_hi[riddleIndex].answer;
    /*if (riddle_answer.toLowerCase() === riddle_answer_user.toLowerCase()) {
      is_correct = true;
    }*/
  }

  for (let count = 0; count < riddle_answers.length; count++) {
    if (riddle_answers[count].toLowerCase() === riddle_answer_user.toLowerCase()) {
      is_correct = true;
      console.log('is correct', is_correct, 'correct answer ', riddle_answers[count]);
      break;
    }
  } // end for

  return {
    'index': riddleIndex,
    'is_correct': is_correct,
    'riddle_answer': riddle_answers[0]
  }

}; // end



function resolveCanonical(slot) {
  console.log('resolveCanonical for ', slot.value);

  let canonical = slot.value;
  try {
    if (slot.resolutions) {
      var status_code = slot.resolutions.resolutionsPerAuthority[0].status.code;
      console.log('check slot resolutions for status ', status_code);

      if (status_code === 'ER_SUCCESS_MATCH') {
        canonical = slot.resolutions.resolutionsPerAuthority[0].values[0].value.name;
      }
    }
  } catch (err) {
    console.log('resolveCanonical error', err.message);
  };

  return canonical;
};

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    WelcomeHandler,
    RiddleAnswerHandler,
    HelpHandler,
    ExitHandler,
    FallbackHandler,
    SessionEndedRequestHandler,
  )
  .addRequestInterceptors(LocalizationInterceptor)
  .addErrorHandlers(ErrorHandler)
  .lambda();


// language strings
const enData = {
  translation: {
    SKILL_NAME: 'Musical Instruments Quiz',
    WELCOME_MESSAGE: 'Welcome to %s. %s will play a musical instrument and you have to guess the instrument name. Let\'s start <break time=".5s"/> %s',
    RIDDLE_QUESTION: 'Here is the musical instrument sound <break time=".5s"/> %s Which musical instrument is this?',
    RIDDLE_QUESTION_ANOTHER: '<break time="1s"/> Here is the next instrument sound <break time="1s"/> %s Tell me the name of the instrument?',
    RIDDLE_QUESTION_REPROMPT: 'Which musical instrument is playing?',
    WLECOME_MESSAGE_DISPLAY_TITLE: 'Musical Instrument Quiz',
    WLECOME_MESSAGE_DISPLAY_BODY: 'Which musical instrument is playing?',
    RIDDLE_ANSWER: '%s <break time="1s"/> The instrument is %s %s',
    RIDDLE_ANSWER_REPROMPT: '<break time="2s"/> Here is another musical instrument sound <break time="1s"/> %s <break time="1s"/> Which instrument is playing?',
    RIDDLE_ANSWER_DISPLAY_TITLE: 'Guess the Musical Instrument Name',
    RIDDLE_ANSWER_DISPLAY_BODY: 'Which musical instrument is playing?',
    RIDDLE_ANSWER_RIGHT: "WoW. You got it right",
    RIDDLE_ANSWER_WRONG: "Oh ho. You missed it",
    HELP_MESSAGE: '%s will play a tune and you have to guess the musical instrument name. You can say stop or cancel anytime to exit from the skill <break time=".5s"/> Be ready <break time="1s"/> %s Can you tell me which musical instrument is playing?',
    HELP_REPROMPT: 'Tell me, What is the musical instrument name?',
    FALLBACK_MESSAGE: `Sorry, I didn't get that. Please say again?`,
    FALLBACK_REPROMPT: 'What can I help you with?',
    ERROR_MESSAGE: 'Sorry, an error occurred. Please try after some time',
    STOP_MESSAGE: `Okay, let's try this again later`
  },
};

const eninData = {
  translation: {
    SKILL_NAME: 'Musical Instruments Quiz'
  },
};


// constructs i18n and l10n data structure
const languageStrings = {
  'en': enData,
  'en-IN': eninData
};
