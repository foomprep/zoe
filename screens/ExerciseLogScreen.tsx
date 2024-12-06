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
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useModal } from '../modals/ModalContext';
import NewExerciseModalContent from '../modals/NewExerciseModalContent';
import ExerciseModalContent from '../modals/ExerciseModalContent';
import KeyboardAwareForm from '../components/KeyboardAwareForm';
import { Button, Text } from 'react-native-paper';
import CustomPicker from '../components/CustomPicker';
import { Dropdown } from 'react-native-element-dropdown';

interface ExerciseLogScreenProps {
  route: any;
}

interface ExerciseFormData {
  weight: string;
  reps: string;
  notes: string;
}

function ExerciseLogScreen({ route }: ExerciseLogScreenProps): React.JSX.Element {
  const [isFocus, setIsFocus] = useState<boolean>(false);
  const [exercises, setExercises] = useState<DropdownItem[]>([])
  const [selectedItem, setSelectedItem] = useState<DropdownItem | undefined>(undefined);
  const [data, setData] = useState<DataPoint[]>([]);
  const [date, setDate] = useState(new Date());
  const { showModal } = useModal();

  const dropdownItems = [
    {
      value: 'new_exercise',
      label: 'Add New Exercise'
    }, 
    ...exercises
  ];

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
    }
  ];

  const onChange = (_event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setDate(currentDate);
  };

  const showDatePicker = () => {
    DateTimePickerAndroid.open({
      value: date,
      onChange,
      mode: 'date',
      is24Hour: true,
      display: 'default'
    });
  };

  useEffect(() => {
    getExerciseNames()
      .then(names => {
        const sortedNames = names.sort((a, b) => a.localeCompare(b));
        const items = sortedNames.map(name => ({
          label: convertFromDatabaseFormat(name),
          value: name,
        }));
        setExercises(items);
        if (route.params && route.params.name) {
          const item = {
            label: convertFromDatabaseFormat(route.params.name),
            value: route.params.name,
          };
          setSelectedItem(item);
          handleSelect(item);
        }
      })
      .catch(err => {
        showToastError('Could not get exercises: ' + err.toString());
      }); 
  }, []);

  const handleSelect = async (item: DropdownItem) => {
    const dataPoints = await getExercisesByNameAndConvertToDataPoint(item.value);
    setData(dataPoints);
  }

  const reloadData = async (name: string) => {
    setData(await getExercisesByNameAndConvertToDataPoint(name)); 
    setDate(new Date());
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
            createdAt: Math.floor(date.getTime() / 1000),
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
      showModal(<ExerciseModalContent reloadData={reloadData} entry={m} />)
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      { data && selectedItem && (
        <ScatterPlot
          onDataPointClick={handleDataPointClick}
          data={data}
          title={selectedItem.label}
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
            <Button icon="calendar" onPress={showDatePicker}>
              <Text>{date.toDateString()}</Text>
            </Button>
          </View>
        )
      }
      <Dropdown
        style={[styles.dropdown, isFocus && { borderColor: 'blue' }]}
        placeholderStyle={styles.placeholderStyle}
        selectedTextStyle={styles.selectedTextStyle}
        inputSearchStyle={styles.inputSearchStyle}
        iconStyle={styles.iconStyle}
        data={dropdownItems}
        search
        maxHeight={300}
        labelField="label"
        valueField="value"
        placeholder={!isFocus ? 'Select exercise' : '...'}
        searchPlaceholder="Search..."
        value={selectedItem === undefined ? '' : selectedItem.value}
        onFocus={() => setIsFocus(true)}
        onBlur={() => setIsFocus(false)}
        onChange={item => {
          console.log(item);
          if (item.value === "new_exercise") {
            showModal(
              <NewExerciseModalContent
                setData={setData}
                setExercises={setExercises}
                exercises={exercises}
                setSelectedItem={setSelectedItem}
              />
            );
          } else {
            setSelectedItem(item);
            handleSelect(item);
          }
        }}
      />
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
  dropdown: {
      height: 50,
      borderColor: 'gray',
      borderWidth: 0.5,
      borderRadius: 8,
      paddingHorizontal: 8,
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
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  }
});
export default ExerciseLogScreen;
