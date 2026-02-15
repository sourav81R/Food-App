import React from 'react'

const fallbackShopImages = [
  "https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/941861/pexels-photo-941861.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/260922/pexels-photo-260922.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/696218/pexels-photo-696218.jpeg?auto=compress&cs=tinysrgb&w=1200"
]

const isNonFoodImageUrl = (url = "") =>
  /cat|dog|kitten|puppy|animal|pet|loremflickr|placekitten|placebear/i.test(url);

function CategoryCard({name,image,onClick}) {
  const fallbackShopImage = fallbackShopImages[
    ([...(name || "default")].reduce((acc, char) => acc + char.charCodeAt(0), 0) % fallbackShopImages.length)
  ]
  const resolvedShopImage = !image || isNonFoodImageUrl(image) ? fallbackShopImage : image
  return (
    <div className='w-[120px] h-[120px] md:w-[180px] md:h-[180px] rounded-2xl border-2 border-[#ff4d2d] shrink-0 overflow-hidden bg-white shadow-xl shadow-gray-200 hover:shadow-lg transition-shadow relative' onClick={onClick}>
     <img
      src={resolvedShopImage}
      alt={name}
      loading='lazy'
      className=' w-full h-full object-cover transform hover:scale-110 transition-transform duration-300'
      onError={(event) => {
        if (event.currentTarget.src === fallbackShopImage) {
          return
        }
        event.currentTarget.src = fallbackShopImage
      }}
     />
     <div className='absolute  bottom-0 w-full left-0  bg-[#ffffff96] bg-opacity-95 px-3 py-1 rounded-t-xl text-center shadow text-sm font-medium text-gray-800 backdrop-blur'>
{name}
     </div>
    </div>
  )
}

export default CategoryCard
