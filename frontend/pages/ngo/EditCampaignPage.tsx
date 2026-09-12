import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { campaignAPI } from '../../services/api.ts';
import type { Campaign } from '../../types.ts';
import { AuthContext } from '../../context/AuthContext.tsx';
import Button from '../../components/Button.tsx';
import { useToast } from '../../context/ToastContext.tsx';
import { FiSave, FiArrowLeft } from 'react-icons/fi';

const EditCampaignPage: React.FC = () => {
    const { campaignId } = useParams<{ campaignId: string }>();
    const { user: ngoUser } = useContext(AuthContext);
    const { addToast } = useToast();

    const [formData, setFormData] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const navigate = useNavigate();

    const fetchCampaign = useCallback(async () => {
        if (!campaignId) {
            setError('No campaign ID provided.');
            setLoading(false);
            return;
        }

        if (!ngoUser?._id) {
            setError('User information is not available.');
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        try {
            /*
             * Fetch the NGO's own campaigns instead of using organizerId
             * to determine ownership.
             *
             * The backend filters these campaigns using:
             * createdBy = logged-in NGO user ID
             *
             * This avoids comparing the NGO profile ID with the User ID.
             */
            const myCampaigns =
                await campaignAPI.getUserCampaigns();

            const campaign =
                myCampaigns.find(
                    (item: Campaign) =>
                        String(item._id) === String(campaignId)
                );

            if (!campaign) {
                throw new Error(
                    'Campaign not found or you do not have permission to edit it.'
                );
            }

            /*
             * Populate the form using the backend's canonical
             * campaign fields.
             */
            setFormData({
                title: campaign.title || '',
                description: campaign.description || '',

                fullDescription:
                    campaign.fullDescription ||
                    (campaign as any).explainStory ||
                    '',

                category:
                    campaign.category || 'Education',

                targetAmount:
                    campaign.goal ||
                    (campaign as any).goalAmount ||
                    campaign.targetAmount ||
                    '',

                endDate:
                    campaign.endDate
                        ? new Date(campaign.endDate)
                              .toISOString()
                              .split('T')[0]
                        : '',

                location:
                    campaign.location || '',

                contactNumber:
                    (campaign as any).contactNumber || '',

                importance:
                    (campaign as any).importance || '',
            });

        } catch (err: any) {
            console.error(
                'Error fetching campaign:',
                err
            );

            const msg =
                err.message ||
                'Failed to fetch campaign.';

            setError(msg);
            addToast(msg, 'error');

            navigate('/ngo/campaigns');

        } finally {
            setLoading(false);
        }
    }, [
        campaignId,
        ngoUser,
        addToast,
        navigate
    ]);

    useEffect(() => {
        fetchCampaign();
    }, [fetchCampaign]);


    const handleChange = (
        e: React.ChangeEvent<
            HTMLInputElement |
            HTMLSelectElement |
            HTMLTextAreaElement
        >
    ) => {
        const { name, value } = e.target;

        setFormData((prev: any) => ({
            ...prev,
            [name]: value
        }));
    };


    const handleSubmitDetails = async (
        e: React.FormEvent
    ) => {
        e.preventDefault();

        if (!campaignId) return;

        setError('');
        setSaving(true);

        /*
         * Convert frontend form fields into the field names
         * expected by the Campaign model.
         */
        const dataToSubmit = {
            campaignName: formData.title,
            title: formData.title,

            description:
                formData.description,

            explainStory:
                formData.fullDescription,

            fullDescription:
                formData.fullDescription,

            category:
                formData.category,

            goalAmount:
                Number(formData.targetAmount),

            targetAmount:
                Number(formData.targetAmount),

            endDate:
                formData.endDate,

            location:
                formData.location,

            contactNumber:
                formData.contactNumber,

            importance:
                formData.importance,
        };

        console.log(
            '📤 Updating NGO campaign:',
            dataToSubmit
        );

        try {
            await campaignAPI.update(
                campaignId,
                dataToSubmit
            );

            addToast(
                'Campaign details updated successfully!',
                'success'
            );

            navigate('/ngo/campaigns');

        } catch (err: any) {
            console.error(
                '❌ Campaign update error:',
                err
            );

            const msg =
                err.message ||
                'Failed to update campaign details.';

            setError(msg);

            addToast(
                msg,
                'error'
            );

        } finally {
            setSaving(false);
        }
    };


    if (loading) {
        return (
            <div className="p-6">
                Loading campaign data...
            </div>
        );
    }


    if (error && !formData.title) {
        return (
            <div className="p-4 bg-red-100 text-red-700 rounded-md">
                {error}
            </div>
        );
    }


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
                Edit Campaign:{' '}
                <span className="text-brand-gold">
                    {formData.title}
                </span>
            </h1>


            {/* Form */}
            <form
                onSubmit={handleSubmitDetails}
                className="space-y-6 bg-white dark:bg-brand-dark-200 p-6 rounded-lg shadow-md"
            >

                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md">
                        {error}
                    </div>
                )}


                <h2 className="text-xl font-semibold border-b dark:border-gray-700 pb-2">
                    Campaign Details
                </h2>


                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Campaign Title */}
                    <input
                        name="title"
                        value={formData.title || ''}
                        onChange={handleChange}
                        placeholder="Campaign Title"
                        required
                        className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />


                    {/* Short Description */}
                    <textarea
                        name="description"
                        value={formData.description || ''}
                        onChange={handleChange}
                        placeholder="Short Description"
                        required
                        maxLength={150}
                        className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-24"
                    />


                    {/* Full Story */}
                    <textarea
                        name="fullDescription"
                        value={formData.fullDescription || ''}
                        onChange={handleChange}
                        placeholder="Full Story / Detailed Explanation"
                        required
                        className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-32"
                    />


                    {/* Importance */}
                    <textarea
                        name="importance"
                        value={formData.importance || ''}
                        onChange={handleChange}
                        placeholder="Why is this campaign important?"
                        required
                        className="md:col-span-2 px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold h-24"
                    />


                    {/* Category */}
                    <select
                        name="category"
                        value={
                            formData.category ||
                            'Education'
                        }
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


                    {/* Fundraising Goal */}
                    <input
                        type="number"
                        name="targetAmount"
                        value={
                            formData.targetAmount || ''
                        }
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
                        value={
                            formData.contactNumber || ''
                        }
                        onChange={handleChange}
                        placeholder="Contact Number"
                        required
                        className="px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />


                    {/* End Date */}
                    <input
                        type="date"
                        name="endDate"
                        value={
                            formData.endDate || ''
                        }
                        onChange={handleChange}
                        required
                        className="px-4 py-2 border rounded-md bg-white dark:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />


                    {/* Location */}
                    <input
                        name="location"
                        value={
                            formData.location || ''
                        }
                        onChange={handleChange}
                        placeholder="Location"
                        required
                        className="px-4 py-2 border rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    />

                </div>


                {/* Save */}
                <div className="flex justify-end pt-4">

                    <Button
                        type="submit"
                        disabled={saving}
                    >
                        <FiSave className="mr-2" />

                        {saving
                            ? 'Saving...'
                            : 'Save Changes'}
                    </Button>

                </div>

            </form>
        </div>
    );
};

export default EditCampaignPage;