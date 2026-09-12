import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { campaignAPI } from '../../services/api.ts';
import Button from '../../components/Button.tsx';
import { AuthContext } from '../../context/AuthContext.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { FiSave, FiArrowLeft } from 'react-icons/fi';

const CreateCampaignPage: React.FC = () => {
    const { user: ngoUser } = useContext(AuthContext);
    const { addToast } = useToast();

    const [formData, setFormData] = useState<any>({
        title: '',
        description: '',
        fullDescription: '',
        category: 'Education',
        targetAmount: '',
        endDate: '',
        location: '',
        contactNumber: '',
        importance: '',
    });

    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >
    ) => {
        const { name, value } = e.target;

        setFormData((prev: any) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files) {
            setImageFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setError('');
        setLoading(true);

        /*
         * The Campaign model expects these names:
         * campaignName
         * contactNumber
         * explainStory
         * importance
         * goalAmount
         *
         * The existing form uses:
         * title
         * fullDescription
         * targetAmount
         *
         * So we map the form fields to the backend fields here.
         */
        const dataToSubmit = {
            // Required backend field
            campaignName: formData.title,

            // Keep title as well for compatibility with existing features
            title: formData.title,

            // Existing short description
            description: formData.description,

            // Required backend field
            explainStory: formData.fullDescription,

            // Keep existing field for compatibility
            fullDescription: formData.fullDescription,

            category: formData.category,

            // Required backend field
            goalAmount: Number(formData.targetAmount),

            // Keep existing field for compatibility
            targetAmount: Number(formData.targetAmount),

            endDate: formData.endDate,
            location: formData.location,

            // Required backend field
            contactNumber: formData.contactNumber,

            // Required backend field
            importance: formData.importance,

            // Associate campaign with logged-in NGO
            ngoId: ngoUser?._id,
        };

        console.log('📤 Creating NGO campaign:', dataToSubmit);

        try {
            const response = await campaignAPI.create(dataToSubmit);

            console.log('📥 Campaign creation response:', response);

            const newCampaignId = response?.campaign?._id;

            if (!newCampaignId) {
                throw new Error(
                    'Campaign created, but no ID was returned.'
                );
            }

            /*
             * Upload images after campaign creation.
             */
            if (imageFiles.length > 0) {
                addToast(
                    'Campaign details saved! Uploading images...',
                    'info'
                );

                const imageFormData = new FormData();

                imageFiles.forEach((file) => {
                    imageFormData.append('images', file);
                });

                await campaignAPI.uploadImages(
                    newCampaignId,
                    imageFormData
                );
            }

            addToast(
                'Campaign submitted for approval!',
                'success'
            );

            navigate('/ngo/campaigns');

        } catch (err: any) {
            console.error(
                '❌ NGO campaign creation error:',
                err
            );

            const msg =
                err?.message ||
                'Failed to create campaign.';

            setError(msg);

            addToast(msg, 'error');

        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Back */}
            <Link
                to="/ngo/campaigns"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-brand-gold font-semibold"
            >
                <FiArrowLeft />
                Back to My Campaigns
            </Link>

            {/* Heading */}
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                Create New Campaign
            </h1>

            <form
                onSubmit={handleSubmit}
                className="space-y-6"
            >

                {/* Error */}
                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">
                        {error}
                    </div>
                )}

                {/* Campaign Details */}
                <div className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-md space-y-4">

                    <h2 className="text-xl font-semibold border-b dark:border-gray-700 pb-2">
                        Campaign Details
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Campaign Title */}
                        <input
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="Campaign Title"
                            required
                            className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />

                        {/* Short Description */}
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Short Description (max 150 characters)"
                            required
                            maxLength={150}
                            className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-20"
                        />

                        {/* Full Story */}
                        <textarea
                            name="fullDescription"
                            value={formData.fullDescription}
                            onChange={handleChange}
                            placeholder="Full Story / Detailed Explanation"
                            required
                            className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-32"
                        />

                        {/* Importance */}
                        <textarea
                            name="importance"
                            value={formData.importance}
                            onChange={handleChange}
                            placeholder="Why is this campaign important?"
                            required
                            className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-24"
                        />

                        {/* Category */}
                        <select
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="px-4 py-2 border rounded-md bg-white dark:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        >
                            <option value="Education">
                                Education
                            </option>

                            <option value="Health">
                                Health
                            </option>

                            <option value="Environment">
                                Environment
                            </option>

                            <option value="Disaster Relief">
                                Disaster Relief
                            </option>

                            <option value="Other">
                                Other
                            </option>
                        </select>

                        {/* Goal Amount */}
                        <input
                            type="number"
                            name="targetAmount"
                            value={formData.targetAmount}
                            onChange={handleChange}
                            placeholder="Fundraising Goal (₹)"
                            required
                            min="1"
                            className="px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />

                        {/* Contact Number */}
                        <input
                            type="tel"
                            name="contactNumber"
                            value={formData.contactNumber}
                            onChange={handleChange}
                            placeholder="Contact Number"
                            required
                            className="px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />

                        {/* End Date */}
                        <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleChange}
                            required
                            className="px-4 py-2 border rounded-md bg-white dark:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />

                        {/* Location */}
                        <input
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="Location (e.g., City, State)"
                            required
                            className="px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                        />

                    </div>
                </div>

                {/* Campaign Images */}
                <div className="bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-md space-y-4">

                    <h2 className="text-xl font-semibold border-b dark:border-gray-700 pb-2">
                        Campaign Images
                    </h2>

                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-gold/20 file:text-brand-gold hover:file:bg-brand-gold/30"
                    />

                    {imageFiles.length > 0 && (
                        <p className="text-sm text-gray-500">
                            {imageFiles.length} image
                            {imageFiles.length > 1 ? 's' : ''} selected
                        </p>
                    )}

                </div>

                {/* Submit */}
                <div className="flex justify-end">

                    <Button
                        type="submit"
                        disabled={loading}
                    >
                        <FiSave className="mr-2" />

                        {loading
                            ? 'Submitting...'
                            : 'Submit for Approval'}
                    </Button>

                </div>

            </form>
        </div>
    );
};

export default CreateCampaignPage;