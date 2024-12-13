import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View
} from 'react-native';
import ScatterPlot from '../ScatterPlot';
import { getExerciseById, getExerciseNames, postExercise } from '../network/exercise';
import { convertFromDatabaseFormat, getExercisesByNameAndConvertToDataPoint, showToastError } from '../utils';
import DropdownItem from '../types/DropdownItem';
import DataPoint from '../types/DataPoint';
import Toast from 'react-native-toast-message'
import NewExerciseModalContent from '../modals/NewExerciseModalContent';
import ExerciseModalContent from '../modals/ExerciseModalContent';
import KeyboardAwareForm from '../components/KeyboardAwareForm';
import CustomModal from '../CustomModal';
import ExerciseEntry from '../types/ExerciseEntry';
import ExerciseDropdown from '../components/ExerciseDropdown';
interface ExerciseLogScreenProps {
  route: any;
}
interface ExerciseFormData {
  weight: string;
  reps: string;
  notes: string;
  createdAt: number;
}
function ExerciseLogScreen({ route }: ExerciseLogScreenProps): React.JSX.Element {
  const [selectedItem, setSelectedItem] = useState<DropdownItem | undefined>(undefined);
  const [data, setData] = useState<DataPoint[]>([]);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [currentExercisePoint, setCurrentExercisePoint] = useState<ExerciseEntry | null>(null);
  const exerciseLogInputs = [
    {
      name: 'weight',
      placeholder: 'Weight',
      keyboardType: 'numeric' as const,
      defaultValue: '',
    },
    {
      name: 'reps', 
      placeholder: 'Reps',
      keyboardType: 'numeric' as const,
      defaultValue: '',
    },
    {
      name: 'notes',
      placeholder: 'Notes',
      defaultValue: '',
    },
    {
      name: 'createdAt',
      isDate: true,
    },
  ];
  
  useEffect(() => {
    if (route.params && route.params.name) {
      const item = {
        label: convertFromDatabaseFormat(route.params.name),
        value: route.params.name,
      };
      setSelectedItem(item);
      handleSelect(item);
    }
  }, []);
  const handleSelect = async (item: DropdownItem) => {
    const dataPoints = await getExercisesByNameAndConvertToDataPoint(item.value);
    setData(dataPoints);
  }
  const reloadData = async (name: string) => {
    setData(await getExercisesByNameAndConvertToDataPoint(name)); 
  }
  const handleAddDataPoint = (formData: ExerciseFormData) => {
    try {
      if (selectedItem) {
        const parsedWeight = parseFloat(formData.weight);
        const parsedReps = parseInt(formData.reps);
        if (isNaN(parsedReps) || isNaN(parsedWeight)) {
          Toast.show({
            type: 'error',
            text1: 'Whoops!',
            text2: 'Reps or weights must be numbers.'
          });
        } else {
          const newExercise = {
            name: selectedItem.value,
            weight: parsedWeight,
            reps: parsedReps,
            createdAt: formData.createdAt,
            notes: formData.notes,
          }
          postExercise(newExercise)
            .then(insertedEntry => {
              if (insertedEntry._id) {
                reloadData(insertedEntry.name);
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Whoops!',
                  text2: 'Entry could not be added, please try again.'
                });
              }
            });
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
  const handleDataPointClick = (point: DataPoint) => {
    getExerciseById(point.label!).then(m => {
      setCurrentExercisePoint(m);
      setModalKey('exerciseContent');
      setModalVisible(true);
    });
  }

  const onDropdownChange = (item: DropdownItem) => {
    if (item.value === "new_exercise") {
      setModalKey("newExercise");
      setModalVisible(true);
    } else {
      setSelectedItem(item);
      handleSelect(item);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ExerciseDropdown 
        onChange={onDropdownChange} 
        selectedItem={selectedItem}
      />
      { data && selectedItem && (
        <ScatterPlot
          onDataPointClick={handleDataPointClick}
          datasets={[data]}
          zoomAndPanEnabled={false}
        />
      )}
      { 
        selectedItem && (
          <View>
            <KeyboardAwareForm
              inputs={exerciseLogInputs}
              onSubmit={handleAddDataPoint}
              submitButtonText="Add"
            />
          </View>
        )
      }
      <CustomModal visible={modalVisible} setVisible={setModalVisible}>
        { modalKey && modalKey === "newExercise" ? 
          <NewExerciseModalContent
            setData={setData}
            setExercises={setExercises}
            exercises={exercises}
            setSelectedItem={setSelectedItem}
            setModalVisible={setModalVisible}
          /> :
          currentExercisePoint && <ExerciseModalContent reloadData={reloadData} entry={currentExercisePoint} />
        }
      </CustomModal>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: 20,
  },
  label: {
    position: 'absolute',
    backgroundColor: 'white',
    left: 22,
    top: 8,
    zIndex: 999,
    paddingHorizontal: 8,
    fontSize: 14,
  },
});
export default ExerciseLogScreen;
