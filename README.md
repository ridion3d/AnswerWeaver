# AnswerWeaver

AnswerWeaver is a dynamic form generator that allows users to create complex questionnaires from YAML files and generate formatted text outputs based on user responses. The generated text can be used for various purposes, including patient directives, surveys, and other documentation.

## Features

- **Dynamic Form Generation**: Create forms dynamically based on the structure provided in a YAML file.
- **Support for Multiple Question Types**: Supports multiple-choice, checkboxes, and text input questions.
- **Conditional Questions**: Display questions conditionally based on the answers to previous questions.
- **Token Replacement**: Replace placeholders in text blocks with user-provided answers.
- **Markdown Support**: Supports Markdown for formatting text in questions, section titles, and generated text.
- **Default and Placeholder Values**: Define default answers and placeholder text for questions.
- **Intro and Outro Text**: Include introductory and concluding text in the generated document.
- **GitHub Integration**: Load YAML files directly from a GitHub repository.

## Getting Started

### Prerequisites

- A web server to host the HTML, CSS, and JavaScript files.
- Internet connection to fetch YAML files and other resources.

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/AnswerWeaver.git
   cd AnswerWeaver
   ```

2. Open `index.html` in a web browser.

### Usage

1. Enter the URL of a YAML file or a GitHub repository containing YAML files into the provided input field.
2. Click "Load URL" to fetch the YAML file(s).
3. If a GitHub repository is loaded, select the desired YAML file from the dropdown menu.
4. The form will be generated based on the selected YAML file.
5. Fill out the form, and the generated text will be updated automatically based on your responses.

### YAML Structure

Here is an example of the YAML structure used to define the form and generated text:

```yaml
title: "Sample Questionnaire"
introduction: "Welcome to the sample questionnaire. Please answer the following questions."
intro_text: "This is the introduction of the generated text."
outro_text: "This is the conclusion of the generated text. Signed by [first_name] [last_name] on [current_date]."

section_titles:
  questionnaire: "Questionnaire"
  generated_text: "Generated Text"

groups:
  - group_name: "Personal Information"
    questions:
      - id: "first_name"
        type: "text"
        question: "What is your first name?"
        placeholder: "John"
        text_block: "First Name: **[first_name]**"
      - id: "last_name"
        type: "text"
        question: "What is your last name?"
        placeholder: "Doe"
        text_block: "Last Name: **[last_name]**"
      - id: "birth_place"
        type: "text"
        question: "Where were you born?"
        placeholder: "City, Country"
        text_block: "Birth Place: **[birth_place]**"
      - id: "residence_place"
        type: "text"
        question: "Where do you currently live?"
        placeholder: "City, Country"
        default_from: "birth_place"
        text_block: "Residence Place: **[residence_place]**"

  - group_name: "Health Preferences"
    questions:
      - id: "organ_donor"
        type: "multiple_choice"
        question: "Are you an organ donor?"
        options:
          - id: "yes"
            label: "Yes"
            value: "yes"
            text_block: "The patient is an organ donor."
          - id: "no"
            label: "No"
            value: "no"
            text_block: "The patient is not an organ donor."
        none_option: "None of the above"
        default: "yes"
      - id: "organ_donor_details"
        type: "text"
        question: "Please specify any details regarding your organ donation preferences."
        multiline: true
        conditions:
          - id: "organ_donor"
            value: "yes"
        text_block: "Organ Donation Details: [USER_INPUT]"

```

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## Acknowledgements

- [SimpleMDE](https://simplemde.com/) for the Markdown editor.
- [marked](https://marked.js.org/) for Markdown parsing.
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML parsing.
