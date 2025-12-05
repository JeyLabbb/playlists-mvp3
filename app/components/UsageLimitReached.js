export default function UsageLimitReached({ onViewPlans }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl p-8 max-w-md w-full border border-red-200 dark:border-red-800">
        <div className="text-6xl mb-4">🚫</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Has alcanzado tus 5 playlists
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
          Has usado todas tus playlists gratuitas de este mes. 
          Adquiere un plan Founder o Pro para tener playlists ilimitadas.
        </p>
        <button
          onClick={onViewPlans}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          Ver planes
        </button>
      </div>
    </div>
  );
}

