import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import {
    FiSearch,
    FiHeart,
    FiLoader,
    FiShare2
} from 'react-icons/fi';
import {
    API_SERVER_URL,
    apiFetch
} from '../../services/api';

interface Campaign {
    _id: string;
    title: string;
    description: string;
    targetAmount: number;
    raisedAmount: number;
    endDate: string;
    category: string;

    ngoId?: {
        ngoName?: string;
        organizationName?: string;
    };

    image?: string;
    campaignImages?: string[];
    campaignImage?: string;
}

const DonorCampaignListPage: React.FC = () => {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { addToast } = useToast();

    const getAssetUrl = (path?: string) => {
        if (!path) return undefined;

        return path.startsWith('http') ||
            path.startsWith('data:')
            ? path
            : `${API_SERVER_URL}${
                  path.startsWith('/')
                      ? path
                      : `/${path}`
              }`;
    };

    const categories = [
        'Education',
        'Healthcare',
        'Environment',
        'Poverty',
        'Animals',
        'Disaster Relief',
        'Human Rights',
        'Children',
        'Elderly',
        'Other'
    ];

    // ============================================================
    // FETCH CAMPAIGNS
    // ============================================================

    useEffect(() => {
        fetchCampaigns();
    }, [page, search, category, window.location.search]);

    const fetchCampaigns = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams({
                page: page.toString(),
                limit: '12'
            });

            if (search) {
                params.append('search', search);
            }

            if (category) {
                params.append('category', category);
            }

            // Filter campaigns by NGO when opened from
            // "View Campaigns"
            const ngoId =
                new URLSearchParams(
                    window.location.search
                ).get('ngo');

            if (ngoId) {
                params.append('ngoId', ngoId);
            }

            const data = await apiFetch(
                `/donor/campaigns?${params}`
            );

            setCampaigns(
                data?.data?.campaigns ||
                    data?.campaigns ||
                    []
            );

            setTotalPages(
                data?.data?.pagination?.pages ||
                    data?.pagination?.pages ||
                    1
            );
        } catch (error: any) {
            console.error(
                'Failed to fetch campaigns:',
                error
            );

            addToast(
                error?.message ||
                    'Failed to fetch campaigns',
                'error'
            );
        } finally {
            setLoading(false);
        }
    };

    // ============================================================
    // SEARCH
    // ============================================================

    const handleSearch = (
        e: React.FormEvent
    ) => {
        e.preventDefault();
        setPage(1);
        fetchCampaigns();
    };

    // ============================================================
    // PROGRESS
    // ============================================================

    const getProgressPercentage = (
        raised: number,
        target: number
    ) => {
        if (!target || target <= 0) {
            return 0;
        }

        return Math.min(
            (raised / target) * 100,
            100
        );
    };

    // ============================================================
    // SHARE CAMPAIGN
    // ============================================================

    const handleShare = async (
        campaign: Campaign
    ) => {
        const shareUrl =
            `${window.location.origin}/campaign/${campaign._id}`;

        const shareTitle =
            campaign.title ||
            'Support this campaign';

        const shareText =
            `Support "${shareTitle}" and help make a difference!`;

        try {
            // Native sharing on mobile / supported browsers
            if (
                navigator.share
            ) {
                await navigator.share({
                    title: shareTitle,
                    text: shareText,
                    url: shareUrl
                });

                return;
            }

            // Fallback: copy link
            await navigator.clipboard.writeText(
                shareUrl
            );

            addToast(
                'Campaign link copied to clipboard!',
                'success'
            );
        } catch (error: any) {
            // User closing the share dialog is not an error
            if (
                error?.name ===
                'AbortError'
            ) {
                return;
            }

            // Final fallback for browsers where
            // clipboard API isn't available
            try {
                const textArea =
                    document.createElement(
                        'textarea'
                    );

                textArea.value =
                    shareUrl;

                textArea.style.position =
                    'fixed';

                textArea.style.left =
                    '-999999px';

                document.body.appendChild(
                    textArea
                );

                textArea.focus();
                textArea.select();

                document.execCommand(
                    'copy'
                );

                document.body.removeChild(
                    textArea
                );

                addToast(
                    'Campaign link copied to clipboard!',
                    'success'
                );
            } catch {
                addToast(
                    'Unable to share this campaign.',
                    'error'
                );
            }
        }
    };

    // ============================================================
    // RENDER
    // ============================================================

    return (
        <div className="space-y-6">

            {/* HEADER */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Explore Campaigns
                </h1>

                <p className="mt-2 text-gray-600 dark:text-gray-400">
                    Find causes you care about and make a difference.
                </p>
            </div>

            {/* SEARCH AND FILTER */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">

                <form
                    onSubmit={handleSearch}
                    className="flex flex-col md:flex-row gap-4"
                >

                    <div className="flex-1">
                        <div className="relative">

                            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />

                            <input
                                type="text"
                                placeholder="Search campaigns..."
                                value={search}
                                onChange={(e) =>
                                    setSearch(
                                        e.target.value
                                    )
                                }
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />

                        </div>
                    </div>

                    <div className="md:w-48">

                        <select
                            value={category}
                            onChange={(e) =>
                                setCategory(
                                    e.target.value
                                )
                            }
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        >

                            <option value="">
                                All Categories
                            </option>

                            {categories.map(
                                (cat) => (
                                    <option
                                        key={cat}
                                        value={cat}
                                    >
                                        {cat}
                                    </option>
                                )
                            )}

                        </select>

                    </div>

                    <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        Search
                    </button>

                </form>

            </div>

            {/* CAMPAIGNS */}
            {loading ? (

                <div className="flex justify-center items-center py-12">

                    <FiLoader className="animate-spin h-8 w-8 text-blue-600" />

                </div>

            ) : (

                <>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {campaigns.map(
                            (campaign) => {

                                const progress =
                                    getProgressPercentage(
                                        campaign.raisedAmount,
                                        campaign.targetAmount
                                    );

                                const image =
                                    campaign.campaignImage ||
                                    campaign.image ||
                                    campaign.campaignImages?.[0];

                                const imageUrl =
                                    getAssetUrl(
                                        image
                                    );

                                return (
                                    <div
                                        key={campaign._id}
                                        className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden"
                                    >

                                        {/* IMAGE */}
                                        <div className="h-48 bg-gray-200 dark:bg-gray-700 relative">

                                            {imageUrl && (
                                                <img
                                                    src={
                                                        imageUrl
                                                    }
                                                    alt={
                                                        campaign.title
                                                    }
                                                    className="w-full h-full object-cover"
                                                />
                                            )}

                                            <div className="absolute top-4 left-4">

                                                <span className="bg-blue-600 text-white px-2 py-1 rounded text-sm">
                                                    {
                                                        campaign.category
                                                    }
                                                </span>

                                            </div>

                                        </div>

                                        {/* CONTENT */}
                                        <div className="p-6">

                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                {
                                                    campaign.title
                                                }
                                            </h3>

                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                                                By{' '}
                                                {campaign.ngoId?.ngoName ||
                                                    campaign.ngoId?.organizationName ||
                                                    'Verified NGO'}
                                            </p>

                                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                                                {
                                                    campaign.description
                                                }
                                            </p>

                                            {/* PROGRESS BAR */}
                                            <div className="mb-4">

                                                <div className="flex justify-between text-sm mb-1">

                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        Progress
                                                    </span>

                                                    <span className="text-gray-900 dark:text-white font-semibold">
                                                        {progress.toFixed(
                                                            0
                                                        )}
                                                        %
                                                    </span>

                                                </div>

                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">

                                                    <div
                                                        className="bg-green-500 h-2 rounded-full"
                                                        style={{
                                                            width: `${progress}%`
                                                        }}
                                                    />

                                                </div>

                                                <div className="flex justify-between text-sm mt-1">

                                                    <span className="text-green-600 font-semibold">
                                                        ₹
                                                        {Number(
                                                            campaign.raisedAmount ||
                                                                0
                                                        ).toLocaleString(
                                                            'en-IN'
                                                        )}
                                                    </span>

                                                    <span className="text-gray-600 dark:text-gray-400">
                                                        of ₹
                                                        {Number(
                                                            campaign.targetAmount ||
                                                                0
                                                        ).toLocaleString(
                                                            'en-IN'
                                                        )}
                                                    </span>

                                                </div>

                                            </div>

                                            {/* DATE + ACTIONS */}
                                            <div className="flex flex-col gap-3">

                                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                                    Ends:{' '}
                                                    {new Date(
                                                        campaign.endDate
                                                    ).toLocaleDateString(
                                                        'en-IN'
                                                    )}
                                                </span>

                                                {/* ACTION BUTTONS */}
                                                <div className="flex gap-2">

                                                    {/* DONATE */}
                                                    <Link
                                                        to={`/donate?campaign=${campaign._id}`}
                                                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                                    >
                                                        <FiHeart
                                                            className="mr-2"
                                                            size={17}
                                                        />

                                                        Donate
                                                    </Link>

                                                    {/* SHARE */}
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleShare(
                                                                campaign
                                                            )
                                                        }
                                                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
                                                        title="Share campaign"
                                                    >
                                                        <FiShare2
                                                            size={18}
                                                        />

                                                        <span className="ml-2">
                                                            Share
                                                        </span>
                                                    </button>

                                                </div>

                                            </div>

                                        </div>

                                    </div>
                                );
                            }
                        )}

                    </div>

                    {/* NO CAMPAIGNS */}
                    {campaigns.length === 0 && (
                        <div className="text-center py-12">

                            <p className="text-gray-500 dark:text-gray-400 text-lg">
                                No campaigns found
                            </p>

                        </div>
                    )}

                    {/* PAGINATION */}
                    {totalPages > 1 && (
                        <div className="flex justify-center mt-8">

                            <div className="flex space-x-2">

                                <button
                                    onClick={() =>
                                        setPage(
                                            Math.max(
                                                1,
                                                page - 1
                                            )
                                        )
                                    }
                                    disabled={
                                        page === 1
                                    }
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Previous
                                </button>

                                <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                                    Page {page} of{' '}
                                    {totalPages}
                                </span>

                                <button
                                    onClick={() =>
                                        setPage(
                                            Math.min(
                                                totalPages,
                                                page + 1
                                            )
                                        )
                                    }
                                    disabled={
                                        page ===
                                        totalPages
                                    }
                                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Next
                                </button>

                            </div>

                        </div>
                    )}

                </>

            )}

        </div>
    );
};

export default DonorCampaignListPage;