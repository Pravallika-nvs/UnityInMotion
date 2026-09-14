
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiFetch } from '../../services/api';
import { useToast } from '../../context/ToastContext.tsx';

interface Campaign {
    _id: string;
    title: string;
    description?: string;
    targetAmount?: number;
    raisedAmount?: number;
    image?: string;
    isActive?: boolean;
}

interface NGO {
    _id: string;
    ngoName: string;
    email: string;
    ngoType: string;
    is80GCertified: boolean;
    is12ACertified: boolean;
    logo?: string;
    description?: string;
    location?: string;
    website?: string;
}

interface NGOResponse {
    ngo: NGO;
    campaigns: Campaign[];
}

const NgoDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { addToast } = useToast();

    const [ngo, setNgo] = useState<NGO | null>(null);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNgoDetails = async () => {
            if (!id) {
                return;
            }

            try {
                const response = await apiFetch<NGOResponse>(
                    '/company/ngos/' + id
            );

                setNgo(response.ngo);
                setCampaigns(response.campaigns || []);
            } catch (error: any) {
                console.error('NGO DETAILS ERROR:', error);

                addToast(
                    error.message || 'Failed to fetch NGO campaigns',
                    'error'
                );
            } finally {
                setLoading(false);
            }
        };

        fetchNgoDetails();
    }, [id, addToast]);

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary"></div>
            </div>
        );
    }

    if (!ngo) {
        return (
            <div className="text-center py-12">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    NGO not found
                </h2>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-brand-dark-200 rounded-xl shadow-md p-6">
                <div className="flex flex-col md:flex-row gap-6 items-start">
                    {ngo.logo && (
                        <img
                            src={ngo.logo}
                            alt={ngo.ngoName}
                            className="w-28 h-28 rounded-full object-cover"
                        />
                    )}

                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                            {ngo.ngoName}
                        </h1>

                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {ngo.ngoType}
                        </p>

                        {ngo.location && (
                            <p className="text-gray-600 dark:text-gray-300 mt-2">
                                {ngo.location}
                            </p>
                        )}

                        {ngo.email && (
                            <p className="text-gray-600 dark:text-gray-300 mt-1">
                                {ngo.email}
                            </p>
                        )}

                        {ngo.description && (
                            <p className="text-gray-600 dark:text-gray-300 mt-4">
                                {ngo.description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                    Campaigns
                </h2>

                {campaigns.length === 0 ? (
                    <div className="bg-white dark:bg-brand-dark-200 rounded-xl p-8 text-center shadow-md">
                        <p className="text-gray-500 dark:text-gray-400">
                            This NGO currently has no active campaigns.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {campaigns.map((campaign) => (
                            <div
                                key={campaign._id}
                                className="bg-white dark:bg-brand-dark-200 rounded-xl shadow-md overflow-hidden"
                            >
                                {campaign.image && (
                                    <img
                                        src={campaign.image}
                                        alt={campaign.title}
                                        className="w-full h-48 object-cover"
                                    />
                                )}

                                <div className="p-5">
                                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                        {campaign.title}
                                    </h3>

                                    {campaign.description && (
                                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                                            {campaign.description}
                                        </p>
                                    )}

                                    {campaign.targetAmount !== undefined && (
                                        <p className="mt-4 font-semibold text-gray-800 dark:text-white">
                                            Target: ₹
                                            {campaign.targetAmount.toLocaleString(
                                                'en-IN'
                                            )}
                                        </p>
                                    )}

                                    {campaign.raisedAmount !== undefined && (
                                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                                            Raised: ₹
                                            {campaign.raisedAmount.toLocaleString(
                                                'en-IN'
                                            )}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NgoDetailsPage;
