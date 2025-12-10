import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Meal = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strTags?: string;
  strYoutube?: string;
  ingredients: { ingredient: string; measure: string }[];
};

const API_BASE = 'https://www.themealdb.com/api/json/v1/1';

export default function App() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [categories, setCategories] = useState<{ strCategory: string }[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Função para extrair ingredientes da resposta da API
  const extractIngredients = (meal: any): { ingredient: string; measure: string }[] => {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      
      if (ingredient && ingredient.trim() !== '') {
        ingredients.push({
          ingredient,
          measure: measure || 'A gosto',
        });
      }
    }
    return ingredients;
  };

  // Carregar categorias
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch(`${API_BASE}/categories.php`);
        const data = await res.json();
        setCategories(data.categories);
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
      }
    }
    loadCategories();
  }, []);

  // Carregar receitas
  async function loadMeals(category?: string, searchQuery?: string) {
    setLoading(true);
    try {
      let url = `${API_BASE}/`;
      
      if (searchQuery && searchQuery.trim() !== '') {
        url += `search.php?s=${searchQuery}`;
      } else if (category) {
        url += `filter.php?c=${category}`;
      } else {
        url += `search.php?s=`;
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.meals) {
        // Se for uma busca ou filtro por categoria, precisamos buscar detalhes de cada receita
        if (searchQuery || category) {
          const detailedMeals = await Promise.all(
            data.meals.slice(0, 20).map(async (meal: any) => {
              const detailRes = await fetch(`${API_BASE}/lookup.php?i=${meal.idMeal}`);
              const detailData = await detailRes.json();
              const detailedMeal = detailData.meals[0];
              return {
                ...detailedMeal,
                ingredients: extractIngredients(detailedMeal),
              };
            })
          );
          setMeals(detailedMeals);
        } else {
          // Para carregamento inicial, mostra receitas populares
          const popularRes = await fetch(`${API_BASE}/filter.php?c=Beef`);
          const popularData = await popularRes.json();
          const detailedPopularMeals = await Promise.all(
            popularData.meals.slice(0, 15).map(async (meal: any) => {
              const detailRes = await fetch(`${API_BASE}/lookup.php?i=${meal.idMeal}`);
              const detailData = await detailRes.json();
              const detailedMeal = detailData.meals[0];
              return {
                ...detailedMeal,
                ingredients: extractIngredients(detailedMeal),
              };
            })
          );
          setMeals(detailedPopularMeals);
        }
      } else {
        setMeals([]);
      }
    } catch (error) {
      console.error('Erro ao carregar receitas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // Carregar receitas iniciais
  useEffect(() => {
    loadMeals();
  }, []);

  // Buscar receitas
  const handleSearch = () => {
    if (query.trim() !== '') {
      setSelectedCategory('');
      loadMeals(undefined, query);
    }
  };

  // Filtrar por categoria
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setQuery('');
    loadMeals(category);
  };

  // Limpar filtros
  const handleClearFilters = () => {
    setQuery('');
    setSelectedCategory('');
    loadMeals();
  };

  // Detalhes da receita
  const renderMealDetails = () => {
    if (!selectedMeal) return null;

    return (
      <View style={styles.modalOverlay}>
        <ScrollView style={styles.modalContent}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedMeal(null)}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <Image
            source={{ uri: selectedMeal.strMealThumb }}
            style={styles.modalImage}
          />
          
          <View style={styles.modalBody}>
            <Text style={styles.modalTitle}>{selectedMeal.strMeal}</Text>
            
            <View style={styles.mealInfo}>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{selectedMeal.strCategory}</Text>
              </View>
              <View style={styles.infoBadge}>
                <Text style={styles.infoBadgeText}>{selectedMeal.strArea}</Text>
              </View>
            </View>

            {selectedMeal.strTags && (
              <View style={styles.tagsContainer}>
                <Text style={styles.sectionTitle}>Tags:</Text>
                <Text style={styles.tagsText}>{selectedMeal.strTags}</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Ingredientes:</Text>
            <View style={styles.ingredientsList}>
              {selectedMeal.ingredients.map((item, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Text style={styles.ingredientName}>• {item.ingredient}</Text>
                  <Text style={styles.ingredientMeasure}>{item.measure}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Modo de Preparo:</Text>
            <Text style={styles.instructions}>
              {selectedMeal.strInstructions}
            </Text>

            {selectedMeal.strYoutube && (
              <TouchableOpacity style={styles.youtubeButton}>
                <Text style={styles.youtubeButtonText}>
                  📺 Ver no YouTube
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  if (loading && meals.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E74C3C" />
        <Text style={styles.muted}>Carregando cardápio...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🍽️ Cardápio Gourmet</Text>
        <Text style={styles.headerSubtitle}>
          Descubra receitas incríveis de todo o mundo
        </Text>
      </View>

      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Buscar receita (ex: pasta, chicken, cake)..."
          value={query}
          onChangeText={setQuery}
          style={styles.input}
          placeholderTextColor="#999"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      {/* Categorias */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={handleClearFilters}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            Todas
          </Text>
        </TouchableOpacity>
        
        {categories.map((category) => (
          <TouchableOpacity
            key={category.strCategory}
            style={[
              styles.categoryChip,
              selectedCategory === category.strCategory && styles.categoryChipActive,
            ]}
            onPress={() => handleCategorySelect(category.strCategory)}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category.strCategory && styles.categoryChipTextActive,
              ]}
            >
              {category.strCategory}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contador de resultados */}
      <View style={styles.resultsInfo}>
        <Text style={styles.resultsText}>
          {meals.length} receita{meals.length !== 1 ? 's' : ''} encontrada{meals.length !== 1 ? 's' : ''}
          {selectedCategory && ` em ${selectedCategory}`}
          {query && ` para "${query}"`}
        </Text>
        {(query || selectedCategory) && (
          <TouchableOpacity onPress={handleClearFilters}>
            <Text style={styles.clearButton}>Limpar filtros</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Lista de receitas */}
      {meals.length > 0 ? (
        <FlatList
          data={meals}
          keyExtractor={(item) => item.idMeal}
          onRefresh={() => loadMeals(selectedCategory, query)}
          refreshing={refreshing}
          numColumns={2}
          columnWrapperStyle={styles.mealsRow}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.mealCard}
              onPress={() => setSelectedMeal(item)}
            >
              <Image
                source={{ uri: item.strMealThumb }}
                style={styles.mealImage}
              />
              <View style={styles.mealInfoContainer}>
                <Text style={styles.mealName} numberOfLines={2}>
                  {item.strMeal}
                </Text>
                <View style={styles.mealMeta}>
                  <Text style={styles.mealCategory}>{item.strCategory}</Text>
                  <Text style={styles.mealArea}>📍 {item.strArea}</Text>
                </View>
                <Text style={styles.viewDetails}>Ver receita →</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🍳</Text>
          <Text style={styles.emptyTitle}>Nenhuma receita encontrada</Text>
          <Text style={styles.emptyText}>
            {query
              ? `Tente buscar por outro termo além de "${query}"`
              : 'Tente selecionar uma categoria diferente'}
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleClearFilters}>
            <Text style={styles.emptyButtonText}>Ver todas as receitas</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de detalhes */}
      {renderMealDetails()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF9F5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F5',
  },
  header: {
    padding: 20,
    backgroundColor: '#E74C3C',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  muted: {
    color: '#666',
    marginTop: 12,
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderColor: '#FFD7D0',
    borderWidth: 2,
    fontSize: 16,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchButton: {
    backgroundColor: '#E74C3C',
    width: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 20,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  categoryChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#FFD7D0',
  },
  categoryChipActive: {
    backgroundColor: '#E74C3C',
    borderColor: '#E74C3C',
  },
  categoryChipText: {
    color: '#666',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  resultsInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  resultsText: {
    color: '#666',
    fontSize: 14,
  },
  clearButton: {
    color: '#E74C3C',
    fontWeight: '600',
    fontSize: 14,
  },
  mealsRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  mealCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '48%',
    marginBottom: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FFF0EC',
  },
  mealImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#FFEDE9',
  },
  mealInfoContainer: {
    padding: 12,
  },
  mealName: {
    fontWeight: 'bold',
    fontSize: 15,
    marginBottom: 6,
    color: '#333',
    height: 40,
  },
  mealMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  mealCategory: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
    backgroundColor: '#FFEDE9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mealArea: {
    fontSize: 11,
    color: '#666',
  },
  viewDetails: {
    fontSize: 12,
    color: '#E74C3C',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 25,
    lineHeight: 22,
  },
  emptyButton: {
    backgroundColor: '#E74C3C',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    zIndex: 1000,
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    marginTop: 40,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1001,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalImage: {
    width: '100%',
    height: 250,
  },
  modalBody: {
    padding: 25,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  mealInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  infoBadge: {
    backgroundColor: '#FFEDE9',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 10,
  },
  infoBadgeText: {
    color: '#E74C3C',
    fontWeight: '600',
  },
  tagsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 5,
  },
  tagsText: {
    color: '#666',
    fontSize: 16,
    lineHeight: 22,
  },
  ingredientsList: {
    marginBottom: 25,
  },
  ingredientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    color: '#444',
  },
  ingredientMeasure: {
    fontSize: 16,
    color: '#E74C3C',
    fontWeight: '600',
  },
  instructions: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 25,
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  youtubeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});