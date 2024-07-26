# AnswerWeaver

AnswerWeaver is a flexible and customizable tool for generating documents based on answers from a questionnaire and predefined text blocks. By simply swapping out the YAML file, AnswerWeaver can be adapted for various use cases.

## How It Works

AnswerWeaver uses a YAML file to define questions and their associated text blocks. The user answers the questions in a web-based form, and AnswerWeaver automatically generates a document that reflects the user's responses.

## Features

- **Flexible and Customizable**: Customize the questions and text blocks by editing the YAML file.
- **Markdown Support**: Use Markdown to format your questions and text blocks.
- **Automatic Text Generation**: Create documents based on user responses.
- **Web-Based Form**: User-friendly web interface for answering questions.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/username/AnswerWeaver.git
   cd AnswerWeaver
   ```

2. Open the `index.html` file in your preferred web browser.

## Usage

1. Customize the `questions.yaml` file to suit your needs. Here is an example structure of the YAML file:

   ```yaml
   title: "Personal Values Document"
   introduction: |
     **Welcome to the creation of your personal values document.**
     Please answer the following questions carefully to document your values and preferences.

   intro_text: |
     **Personal Values and Preferences of [Name]**
     
     This document serves to record my personal values and preferences in the event that I am no longer able to make decisions independently. Please read the following instructions carefully and respect my wishes to ensure that my will is honored.

   groups:
     - group_name: "General Preferences"
       questions:
         - id: q1
           question: "What are your general preferences?"
           type: multiple_choice
           options:
             - id: option1
               label: "Option 1"
               text_block: "I prefer option 1. **...**"

             - id: option2
               label: "Option 2"
               text_block: "I prefer option 2. **...**"

             - id: option3
               label: "Option 3"
               text_block: "I prefer option 3. **...**"

     - group_name: "Personal Values"
       questions:
         - id: q2
           question: "What values are important to you?"
           type: checkbox
           options:
             - id: value1
               label: "Value 1"
               text_block: "Value 1 is important to me. **...**"

             - id: value2
               label: "Value 2"
               text_block: "Value 2 is important to me. **...**"

             - id: value3
               label: "Value 3"
               text_block: "Value 3 is important to me. **...**"

   outro_text: |
     **Confirmation of Values and Preferences**
     
     I, [Name], declare that I have created this document in full possession of my mental faculties and without external pressure. I ask that my wishes and instructions recorded in this document be respected and implemented in the event of decision-making.

     **Location:** [Location]
     
     **Date:** [Date]
     
     **Signature:** ______________________
   ```

## License

This project is licensed under the MIT License. See the LICENSE file for details.
