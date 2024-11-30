import Config from "react-native-config";

const headers = {
  'x-app-id': Config.NUTRITIONIX_APP_ID,
  'x-app-key': Config.NUTRITIONIX_API_KEY,
  'x-remote-user-id': '0',  // Use 0 for development
  'Content-Type': 'application/x-www-form-urlencoded'
};

interface NutritionixResponse<T> {
  data: T;
}

async function searchFoodNatural(query: string): Promise<NutritionixResponse<any>> {
  try {
    const response = await fetch('https://trackapi.nutritionix.com/v2/natural/nutrients', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        query: query,
        // Optional parameters
        timezone: "US/Eastern",
        locale: "en_US"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export const lookupBarcode = async (upc: string): Promise<NutritionixResponse<any>> => {
  try {
    const response = await fetch(`https://trackapi.nutritionix.com/v2/search/item?upc=${upc}`, {
      method: 'GET',
      headers: headers
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

export const getNutritionInfo = async (upc: string) => {
  try {
    const response = await fetch(`https://trackapi.nutritionix.com/v2/search/item?upc=${upc}`, {
      method: 'GET',
      headers: {
        'x-app-id': Config.NUTRITIONIX_APP_ID,
        'x-app-key': Config.NUTRITIONIX_API_KEY,
        'x-remote-user-id': '0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.foods || data.foods.length === 0) {
      throw new Error('Product not found');
    }

    const food = data.foods[0];
    
    return {
      productName: food.food_name,
      brandName: food.brand_name,
      servingSize: {
        quantity: food.serving_qty,
        unit: food.serving_unit,
        grams: food.serving_weight_grams
      },
      calories: {
        perServing: food.nf_calories,
        per100g: (food.nf_calories / food.serving_weight_grams) * 100
      },
      nutrients: {
        totalFat: food.nf_total_fat,
        saturatedFat: food.nf_saturated_fat,
        cholesterol: food.nf_cholesterol,
        sodium: food.nf_sodium,
        totalCarbs: food.nf_total_carbohydrate,
        dietaryFiber: food.nf_dietary_fiber,
        sugars: food.nf_sugars,
        protein: food.nf_protein
      }
    };
  } catch (error) {
    console.error('Error fetching nutrition info:', error);
    throw error;
  }
};

// Function to calculate calories for a specific number of servings
const calculateCalories = (nutritionInfo, numberOfServings) => {
  return {
    totalCalories: nutritionInfo.calories.perServing * numberOfServings,
    servingInfo: {
      original: nutritionInfo.servingSize,
      requested: {
        quantity: nutritionInfo.servingSize.quantity * numberOfServings,
        unit: nutritionInfo.servingSize.unit,
        grams: nutritionInfo.servingSize.grams * numberOfServings
      }
    }
  };
};

// Example usage:
async function example() {
  try {
    // Example UPC for a Coca-Cola
    const upc = '049000006436';
    const nutritionInfo = await getNutritionInfo(upc);
    console.log('Basic nutrition info:', nutritionInfo);

    // Calculate calories for 2.5 servings
    const caloriesFor2_5Servings = calculateCalories(nutritionInfo, 2.5);
    console.log('Calories for 2.5 servings:', caloriesFor2_5Servings);
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Example 3: Brand Item Search
//function searchBrandedItems(query: string, limit = 10): Promise<NutritionixResponse<any>> {
  // try {
  //   const response = await fetch('https://trackapi.nutritionix.com/v2/search/instant', {
  //     method: 'GET',
  //     headers: headers,
  //     params: {
  //       query: query,
  //       branded: true,
  //       common: false,
  //       detailed: true,
  //       limit: limit
  //     }
  //   });

  //   if (!response.ok) {
  //     throw new Error(`HTTP error! status: ${response.status}`);
  //   }

  //   const data = await response.json();
  //   return data;
  // } catch (error) {
  //   console.error('Error:', error);
  //   throw error;
  // }
//}
