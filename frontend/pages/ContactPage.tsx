import React, { useState } from 'react';
import SectionWrapper from '../components/SectionWrapper.tsx';
import Button from '../components/Button.tsx';
import {
  FiMail,
  FiPhone,
  FiMapPin,
  FiPaperclip,
  FiX,
  FiFile
} from 'react-icons/fi';
import { useToast } from '../context/ToastContext.tsx';
import { apiFetch } from '../services/api';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png'
];

const ALLOWED_EXTENSIONS = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png'
];

const ContactPage: React.FC = () => {
  const { addToast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // ============================================================
  // File selection
  // ============================================================
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Maximum number of files
    if (selectedFiles.length + files.length > MAX_FILES) {
      addToast(
        `You can attach a maximum of ${MAX_FILES} files.`,
        'error'
      );

      e.target.value = '';
      return;
    }

    // Validate file types
    const invalidFile = files.find(file => {
      const extension = `.${file.name
        .split('.')
        .pop()
        ?.toLowerCase()}`;

      return (
        !ALLOWED_FILE_TYPES.includes(file.type) &&
        !ALLOWED_EXTENSIONS.includes(extension)
      );
    });

    if (invalidFile) {
      addToast(
        `${invalidFile.name} is not a supported file type.`,
        'error'
      );

      e.target.value = '';
      return;
    }

    // Validate file sizes
    const oversizedFile = files.find(
      file => file.size > MAX_FILE_SIZE
    );

    if (oversizedFile) {
      addToast(
        `${oversizedFile.name} exceeds the 5 MB file size limit.`,
        'error'
      );

      e.target.value = '';
      return;
    }

    setSelectedFiles(prev => [...prev, ...files]);

    // Allows the user to select the same file again
    e.target.value = '';
  };

  // ============================================================
  // Remove selected file
  // ============================================================
  const removeFile = (index: number) => {
    setSelectedFiles(prev =>
      prev.filter((_, fileIndex) => fileIndex !== index)
    );
  };

  // ============================================================
  // Submit contact form
  // ============================================================
  const handleSendMessage = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (isSubmitting) return;

    const form = e.currentTarget;

    // Get ONLY the required text fields
    const name = String(
      (form.elements.namedItem('name') as HTMLInputElement)
        ?.value || ''
    ).trim();

    const email = String(
      (form.elements.namedItem('email') as HTMLInputElement)
        ?.value || ''
    ).trim();

    const subject = String(
      (form.elements.namedItem('subject') as HTMLInputElement)
        ?.value || ''
    ).trim();

    const message = String(
      (form.elements.namedItem('message') as HTMLTextAreaElement)
        ?.value || ''
    ).trim();

    // Only these four fields are required.
    // Attachments are completely optional.

    console.log('CONTACT FORM VALUES:', {
  name,
  email,
  subject,
  message,
  selectedFiles
});

if (!name || !email || !subject || !message) {
  addToast(
    `Missing: ${
      !name ? 'Name ' : ''
    }${
      !email ? 'Email ' : ''
    }${
      !subject ? 'Subject ' : ''
    }${
      !message ? 'Message' : ''
    }`,
    'error'
  );
  return;
}

    setIsSubmitting(true);

    try {
      // Create multipart form data
      const contactFormData = new FormData();

      contactFormData.append('name', name);
      contactFormData.append('email', email);
      contactFormData.append('subject', subject);
      contactFormData.append('message', message);

      // Attach files ONLY if the user selected any
      selectedFiles.forEach(file => {
        contactFormData.append('attachments', file);
      });

      console.log('📤 Sending contact form:', {
        name,
        email,
        subject,
        message,
        attachments: selectedFiles.map(file => file.name)
      });

      const response = await apiFetch('/contact', {
        method: 'POST',
        body: contactFormData
      });

      console.log('📥 Contact API response:', response);

      if (!response || response.success === false) {
        throw new Error(
          response?.message ||
            'Failed to send your message.'
        );
      }

      addToast(
        'Message sent successfully! We will get back to you soon.',
        'success'
      );

      // Reset form and selected files
      form.reset();
      setSelectedFiles([]);

    } catch (error: any) {
      console.error(
        '❌ Contact form error:',
        error
      );

      addToast(
        error?.message ||
          'Unable to send your message. Please try again.',
        'error'
      );

    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-warm-gray font-sans">

      {/* ========================================================
          Header
      ======================================================== */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

          <h1 className="text-4xl font-extrabold text-navy-blue font-serif">
            Get In Touch
          </h1>

          <p className="mt-4 text-xl text-warm-gray-600">
            We'd love to hear from you. Whether you have a question,
            feedback, or a partnership inquiry, please reach out.
          </p>

        </div>
      </div>

      <SectionWrapper className="py-20">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid md:grid-cols-2 gap-12">

            {/* ==================================================
                Contact Form
            ================================================== */}
            <div className="bg-white p-8 rounded-lg shadow-lg">

              <h2 className="text-2xl font-bold font-serif text-navy-blue mb-6">
                Send us a message
              </h2>

              <form
                onSubmit={handleSendMessage}
                className="space-y-6"
              >

                {/* Name */}
                <div>
                  <label
                    htmlFor="name"
                    className="sr-only"
                  >
                    Full name
                  </label>

                  <input
                    type="text"
                    name="name"
                    id="name"
                    autoComplete="name"
                    placeholder="Full name"
                    required
                    className="block w-full shadow-sm py-3 px-4 placeholder-warm-gray-500 focus:ring-sky-blue focus:border-sky-blue border-warm-gray-300 rounded-md"
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    htmlFor="email"
                    className="sr-only"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email address"
                    required
                    className="block w-full shadow-sm py-3 px-4 placeholder-warm-gray-500 focus:ring-sky-blue focus:border-sky-blue border-warm-gray-300 rounded-md"
                  />
                </div>

                {/* Subject */}
                <div>
                  <label
                    htmlFor="subject"
                    className="sr-only"
                  >
                    Subject
                  </label>

                  <input
                    type="text"
                    name="subject"
                    id="subject"
                    placeholder="Subject"
                    required
                    className="block w-full shadow-sm py-3 px-4 placeholder-warm-gray-500 focus:ring-sky-blue focus:border-sky-blue border-warm-gray-300 rounded-md"
                  />
                </div>

                {/* Message */}
                <div>
                  <label
                    htmlFor="message"
                    className="sr-only"
                  >
                    Message
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    placeholder="Your message"
                    required
                    className="block w-full shadow-sm py-3 px-4 placeholder-warm-gray-500 focus:ring-sky-blue focus:border-sky-blue border border-warm-gray-300 rounded-md"
                  />
                </div>

                {/* ==================================================
                    Attach Files
                ================================================== */}
                <div>

                  <label
                    htmlFor="attachments"
                    className="flex items-center justify-center gap-2 w-full border-2 border-dashed border-warm-gray-300 rounded-md px-4 py-4 cursor-pointer hover:border-sky-blue hover:bg-gray-50 transition-colors"
                  >
                    <FiPaperclip className="h-5 w-5 text-sky-blue" />

                    <span className="text-warm-gray-700 font-medium">
                      Attach Files
                    </span>

                    <span className="text-sm text-warm-gray-500">
                      (optional)
                    </span>
                  </label>

                  <input
                    id="attachments"
                    name="attachments"
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="sr-only"
                  />

                  <p className="mt-2 text-xs text-warm-gray-500">
                    PDF, DOC, DOCX, JPG, JPEG, PNG • Maximum 5 files •
                    5 MB per file
                  </p>

                  {/* Selected files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 space-y-2">

                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center justify-between bg-warm-gray-100 rounded-md px-3 py-2"
                        >

                          <div className="flex items-center min-w-0">

                            <FiFile className="flex-shrink-0 mr-2 text-sky-blue" />

                            <span
                              className="text-sm text-warm-gray-700 truncate"
                              title={file.name}
                            >
                              {file.name}
                            </span>

                          </div>

                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="ml-3 flex-shrink-0 text-warm-gray-500 hover:text-red-500 transition-colors"
                            aria-label={`Remove ${file.name}`}
                          >
                            <FiX className="h-5 w-5" />
                          </button>

                        </div>
                      ))}

                    </div>
                  )}

                </div>

                {/* Submit */}
                <div>

                  <Button
                    type="submit"
                    fullWidth
                    disabled={isSubmitting}
                  >
                    {isSubmitting
                      ? 'Sending...'
                      : 'Send Message'}
                  </Button>

                </div>

              </form>

            </div>

            {/* ==================================================
                Contact Information
            ================================================== */}
            <div className="space-y-8">

              <div className="bg-white p-8 rounded-lg shadow-lg">

                <h3 className="text-2xl font-bold font-serif text-navy-blue mb-4">
                  Contact Information
                </h3>

                <div className="space-y-4 text-lg text-warm-gray-700">

                  <p className="flex items-center">

                    <FiMapPin
                      className="flex-shrink-0 mr-3 h-6 w-6 text-sky-blue"
                    />

                    <span>
                      D No: 12345, Visakhapatnam - 530048, Andhra Pradesh, India
                    </span>

                  </p>

                  <p className="flex items-center">

                    <FiPhone
                      className="flex-shrink-0 mr-3 h-6 w-6 text-sky-blue"
                    />

                    <span>
                      +91 11 4567 8901
                    </span>

                  </p>

                  <p className="flex items-center">

                    <FiMail
                      className="flex-shrink-0 mr-3 h-6 w-6 text-sky-blue"
                    />

                    <span>
                      unityinmotion9@gmail.com
                    </span>

                  </p>

                </div>

              </div>

              {/* Location */}
              <div className="w-full rounded-xl bg-white p-10">
  <h2 className="text-2xl font-bold font-serif text-navy-blue mb-4">
    Our Location
  </h2>

  <div className="w-full h-[480px] rounded-lg overflow-hidden">
    <iframe
      src="https://www.google.com/maps?q=GVP+College+of+Engineering,Visakhapatnam&output=embed"
      className="block w-full h-full border-0"
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
    ></iframe>
  </div>
</div>

            </div>

          </div>

        </div>

      </SectionWrapper>

    </div>
  );
};

export default ContactPage;